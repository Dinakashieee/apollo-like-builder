import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { signalHireSearchPayload, normalizeSearchProfiles } from '../_shared/signalhire-search.ts';

const RequestSchema = z.object({
  workspace_id: z.string().uuid(),
  filters: z.object({ name: z.string().max(200).optional(), job_title: z.string().max(200).optional(), location: z.string().max(200).optional(), company: z.string().max(200).optional(), industry: z.string().max(200).optional() }),
  size: z.number().int().min(1).max(100).default(20),
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("SIGNALHIRE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !serviceKey || !anonKey) throw new Error('Service configuration unavailable');

    if (!apiKey) {
      return new Response(JSON.stringify({ ok: false, error: "SIGNALHIRE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    const user = userRes?.user;
    if (!user) {
      return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = RequestSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid search filters" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { workspace_id, filters, size } = parsed.data;
    let shPayload;
    try { shPayload = signalHireSearchPayload(filters, size); }
    catch (error) {
      return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Invalid filters' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Verify membership
    const { data: member } = await admin
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!member) {
      return new Response(JSON.stringify({ ok: false, error: "not a workspace member" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create the search row first with a per-search webhook token
    const callbackToken = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const { data: searchRow, error: insErr } = await admin
      .from("signalhire_searches")
      .insert({ workspace_id, user_id: user.id, filters, status: "pending", callback_token: callbackToken })
      .select("id")
      .single();
    if (insErr || !searchRow) {
      return new Response(JSON.stringify({ ok: false, error: insErr?.message ?? "insert failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const shResp = await fetch("https://www.signalhire.com/api/v1/candidate/searchByQuery", {
      method: "POST",
      headers: { "apikey": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(shPayload),
    });

    const shText = await shResp.text();
    let shJson: any = null;
    try { shJson = JSON.parse(shText); } catch { shJson = shText; }

    if (!shResp.ok) {
      await admin.from("signalhire_searches").update({
        status: "failed",
        error: typeof shJson === "string" ? shJson : JSON.stringify(shJson),
      }).eq("id", searchRow.id);
      return new Response(JSON.stringify({ ok: false, status: shResp.status, error: shJson }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!Array.isArray(shJson?.profiles)) {
      await admin.from('signalhire_searches').update({ status: 'failed', error: 'Unexpected SignalHire search response' }).eq('id', searchRow.id);
      throw new Error('Unexpected SignalHire search response');
    }
    const results = normalizeSearchProfiles(shJson.profiles);
    const requestId = shJson?.requestId ?? shJson?.id ?? null;
    const { error: updateError } = await admin.from("signalhire_searches").update({
      request_id: requestId ? String(requestId) : null,
      status: 'completed', results, profiles_count: results.length, completed_at: new Date().toISOString(),
    }).eq("id", searchRow.id);
    if (updateError) throw new Error('Could not save SignalHire search results');

    return new Response(JSON.stringify({ ok: true, search_id: searchRow.id, request_id: requestId, results, status: 'completed' }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message ?? "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
