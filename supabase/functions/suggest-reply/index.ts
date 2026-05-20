// Generates a suggested reply for an inbound message (email or WhatsApp).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { checkAiEmailQuota, incrementAiEmails } from "../_shared/entitlements.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json({ error: "unauthenticated" }, 401);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI not configured" }, 500);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "unauthenticated" }, 401);

    const { channel, context, leadId } = await req.json();
    if (!leadId || typeof leadId !== "string") {
      return json({ error: "leadId required" }, 400);
    }
    if (channel !== "email" && channel !== "whatsapp") {
      return json({ error: "invalid channel" }, 400);
    }
    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Use the user-scoped client so RLS enforces workspace membership.
    const { data: lead } = await userClient
      .from("leads")
      .select("contact_name, company_name, role, status, pain_points, workspace_id")
      .eq("id", leadId)
      .maybeSingle();
    if (!lead) return json({ error: "forbidden" }, 403);

    // Enforce per-workspace AI quota (mirrors assistant-chat / generate-email).
    const quota = await checkAiEmailQuota(admin, lead.workspace_id as string);
    if (quota) return json({ error: quota.reason, blocked: true, ...quota }, 402);

    const leadCtx = `Lead: ${lead.contact_name ?? ""} at ${lead.company_name ?? ""} (${lead.role ?? "—"}). Status: ${lead.status}. Pain: ${(lead.pain_points ?? []).join(", ")}.`;

    const sys = `You are a senior B2B sales rep crafting the BEST next reply for the user to send.
Channel: ${channel}. Keep it concise, friendly, and action-oriented.
${channel === "whatsapp" ? "WhatsApp tone: short, conversational, max 3 sentences, no formal sign-off." : "Email tone: professional, structured, with a clear next step. Provide a subject line."}
Return JSON via the suggest_reply tool.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: `${leadCtx}\n\nIncoming message:\n"""\n${(context ?? "").slice(0, 4000)}\n"""` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "suggest_reply",
            parameters: {
              type: "object",
              properties: {
                subject: { type: "string" },
                body: { type: "string" },
                rationale: { type: "string" },
              },
              required: ["body", "rationale"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "suggest_reply" } },
      }),
    });
    if (!aiResp.ok) {
      if (aiResp.status === 429) return json({ error: "Rate limited" }, 429);
      if (aiResp.status === 402) return json({ error: "Add AI credits" }, 402);
      return json({ error: "AI error" }, 500);
    }
    const j = await aiResp.json();
    const args = JSON.parse(j.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? "{}");
    return json({ suggestion: args });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
