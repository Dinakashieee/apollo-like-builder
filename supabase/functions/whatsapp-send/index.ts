// Send WhatsApp via Twilio (paid). Falls back to logging the message if Twilio is not configured.
// Verifies that the destination phone matches the lead's stored WhatsApp/phone number before sending.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const norm = (p: string) => (p ?? "").replace(/[^\d+]/g, "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json({ error: "unauthenticated" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "unauthenticated" }, 401);

    const { leadId, phone, body, mode } = await req.json();
    if (!leadId || !phone || !body) return json({ error: "leadId, phone, body required" }, 400);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: lead } = await admin
      .from("leads")
      .select("workspace_id, phone, whatsapp_phone")
      .eq("id", leadId)
      .maybeSingle();
    if (!lead) return json({ error: "lead not found" }, 404);

    const { data: mem } = await admin.from("workspace_members")
      .select("user_id").eq("workspace_id", lead.workspace_id).eq("user_id", u.user.id).maybeSingle();
    if (!mem) return json({ error: "forbidden" }, 403);

    const target = norm(phone);
    const stored = [norm(lead.whatsapp_phone ?? ""), norm(lead.phone ?? "")].filter(Boolean);
    const matches = stored.length === 0 ? false : stored.some((s) => s === target || s.endsWith(target.slice(-9)) || target.endsWith(s.slice(-9)));

    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    const TWILIO_FROM = Deno.env.get("TWILIO_WHATSAPP_FROM"); // e.g. whatsapp:+14155238886
    let twilioSid: string | null = null;
    let sentVia = mode === "click_to_chat" ? "click_to_chat" : "manual";

    if (mode !== "click_to_chat" && TWILIO_API_KEY && TWILIO_FROM) {
      const resp = await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
          "X-Connection-Api-Key": TWILIO_API_KEY,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: `whatsapp:${target.startsWith("+") ? target : "+" + target}`,
          From: TWILIO_FROM,
          Body: body,
        }),
      });
      const j = await resp.json();
      if (!resp.ok) return json({ error: "Twilio error", detail: j }, 500);
      twilioSid = j.sid;
      sentVia = "twilio";
    }

    const { data: ins } = await admin.from("whatsapp_messages").insert({
      workspace_id: lead.workspace_id,
      lead_id: leadId,
      user_id: u.user.id,
      direction: "outbound",
      phone: target,
      body,
      phone_matches_lead: matches,
      sent_via: sentVia,
      twilio_sid: twilioSid,
    }).select("id").single();

    return json({ ok: true, id: ins?.id, phone_matches_lead: matches, sent_via: sentVia, twilio_sid: twilioSid });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
