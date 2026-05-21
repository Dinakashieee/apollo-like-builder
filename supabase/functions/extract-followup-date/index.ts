// Scans an inbound email body for a promised follow-up date and creates a reminder.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { incrementAiEmails } from "../_shared/entitlements.ts";

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

    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "unauthenticated" }, 401);

    const { messageId } = await req.json();
    if (!messageId) return json({ error: "messageId required" }, 400);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: msg } = await admin
      .from("email_messages")
      .select("id, workspace_id, thread_id, body_text, snippet, sent_at, direction")
      .eq("id", messageId)
      .maybeSingle();
    if (!msg) return json({ error: "not found" }, 404);

    const { data: mem } = await admin.from("workspace_members")
      .select("user_id").eq("workspace_id", msg.workspace_id).eq("user_id", u.user.id).maybeSingle();
    if (!mem) return json({ error: "forbidden" }, 403);

    const { data: thread } = await admin.from("email_threads").select("lead_id").eq("id", msg.thread_id).maybeSingle();

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: `Today is ${new Date().toISOString().slice(0,10)}. Detect if the sender promises to follow up on a specific future date or asks the recipient to follow up later. Return ISO date (YYYY-MM-DD) of the promised/requested follow-up. Return found=false if no clear date.` },
          { role: "user", content: (msg.body_text ?? msg.snippet ?? "").slice(0, 4000) },
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_date",
            parameters: {
              type: "object",
              properties: {
                found: { type: "boolean" },
                iso_date: { type: "string" },
                quote: { type: "string" },
              },
              required: ["found"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "extract_date" } },
      }),
    });
    if (!aiResp.ok) return json({ error: "AI error" }, 500);
    const j = await aiResp.json();
    const args = JSON.parse(j.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? "{}");
    await incrementAiEmails(admin, msg.workspace_id as string);
    if (!args.found || !args.iso_date) return json({ ok: true, found: false });

    const dueAt = new Date(`${args.iso_date}T09:00:00Z`).toISOString();
    const { data: existing } = await admin.from("follow_up_reminders")
      .select("id").eq("source_message_id", messageId).maybeSingle();
    if (existing) return json({ ok: true, found: true, reminderId: existing.id });

    const { data: ins, error } = await admin.from("follow_up_reminders").insert({
      workspace_id: msg.workspace_id,
      lead_id: thread?.lead_id ?? null,
      thread_id: msg.thread_id,
      source_message_id: messageId,
      due_at: dueAt,
      note: args.quote ?? "Follow up promised by client",
      source: "auto",
    }).select("id").single();
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, found: true, reminderId: ins.id, due_at: dueAt });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
