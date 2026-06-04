import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const url = new URL(req.url);
    const searchId = url.searchParams.get("search_id");
    const body = await req.json().catch(() => ({}));

    // Body can be: { requestId, status, candidates: [...] } OR array of items
    const requestId = body?.requestId ?? body?.id ?? null;
    let candidates: any[] = [];
    if (Array.isArray(body)) candidates = body;
    else if (Array.isArray(body?.candidates)) candidates = body.candidates;
    else if (Array.isArray(body?.profiles)) candidates = body.profiles;
    else if (Array.isArray(body?.items)) candidates = body.items;
    else if (Array.isArray(body?.data)) candidates = body.data;

    // Normalize each candidate
    const results = candidates.map((c: any, i: number) => {
      const fullName = c.fullName ?? c.name ?? [c.firstName, c.lastName].filter(Boolean).join(" ");
      const emails = c.emails ?? c.contacts?.filter?.((x: any) => x.type === "email")?.map((x: any) => x.value) ?? [];
      const email = Array.isArray(emails) ? (emails[0]?.value ?? emails[0] ?? null) : (typeof emails === "string" ? emails : null);
      const exp = c.experience?.[0] ?? c.currentExperience ?? {};
      return {
        id: c.uid ?? c.id ?? `${requestId ?? "r"}-${i}`,
        name: fullName || "Unknown",
        email,
        company: exp.company ?? c.company ?? "",
        role: exp.position ?? c.title ?? c.headline ?? "",
        location: c.location ?? c.locationName ?? "",
        linkedin: c.social?.find?.((s: any) => s.type === "li")?.link ?? c.linkedin ?? null,
        raw: c,
      };
    });

    const update: Record<string, unknown> = {
      status: "completed",
      results,
      profiles_count: results.length,
      completed_at: new Date().toISOString(),
    };

    if (searchId) {
      await admin.from("signalhire_searches").update(update).eq("id", searchId);
    } else if (requestId) {
      await admin.from("signalhire_searches").update(update).eq("request_id", String(requestId));
    }

    return new Response(JSON.stringify({ ok: true, count: results.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message ?? "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
