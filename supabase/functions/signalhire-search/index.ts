import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("SIGNALHIRE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

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

    const body = await req.json().catch(() => ({}));
    const { workspace_id, filters = {}, size = 20 } = body ?? {};
    if (!workspace_id) {
      return new Response(JSON.stringify({ ok: false, error: "workspace_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

    const callbackUrl = `${supabaseUrl}/functions/v1/signalhire-callback?search_id=${searchRow.id}&token=${callbackToken}`;

    // Build SignalHire searchByQuery payload
    const items: string[] = [];
    if (filters.name) items.push(String(filters.name));
    if (filters.job_title) items.push(String(filters.job_title));
    if (filters.location) items.push(`location:${filters.location}`);
    if (filters.company) items.push(`company:${filters.company}`);
    if (filters.industry) items.push(`industry:${filters.industry}`);

    const shPayload = {
      items: items.length ? items : [filters.query ?? ""],
      callbackUrl,
      size: Math.min(Math.max(Number(size) || 20, 1), 100),
    };

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

    const requestId = shJson?.requestId ?? shJson?.id ?? null;
    await admin.from("signalhire_searches").update({
      request_id: requestId ? String(requestId) : null,
    }).eq("id", searchRow.id);

    return new Response(JSON.stringify({ ok: true, search_id: searchRow.id, request_id: requestId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message ?? "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
