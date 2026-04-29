// Analyze an inbound email reply and return temperature + next-step suggestion.
// Triggered from the client when a new inbound message lands, or manually
// from the conversation view via the "Re-analyze" button.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Body {
  messageId: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) {
      return json({ error: "unauthenticated" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI not configured" }, 500);

    // Verify caller is signed in
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "unauthenticated" }, 401);

    const { messageId } = (await req.json()) as Body;
    if (!messageId) return json({ error: "messageId required" }, 400);

    const admin = createClient(supabaseUrl, serviceKey);

    // Fetch message + thread + lead context (RLS bypassed by service role; we re-check membership)
    const { data: msg, error: msgErr } = await admin
      .from("email_messages")
      .select(
        "id, workspace_id, thread_id, direction, subject, body_text, snippet, from_email, from_name, sent_at",
      )
      .eq("id", messageId)
      .maybeSingle();
    if (msgErr || !msg) return json({ error: "message not found" }, 404);
    if (msg.direction !== "inbound") {
      return json({ error: "only inbound messages can be analyzed" }, 400);
    }

    // Confirm caller is workspace member
    const { data: membership } = await admin
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", msg.workspace_id)
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (!membership) return json({ error: "forbidden" }, 403);

    // Optional thread context
    const { data: thread } = await admin
      .from("email_threads")
      .select("id, lead_id, subject")
      .eq("id", msg.thread_id)
      .maybeSingle();

    let leadContext = "";
    if (thread?.lead_id) {
      const { data: lead } = await admin
        .from("leads")
        .select("company_name, contact_name, role, status, score")
        .eq("id", thread.lead_id)
        .maybeSingle();
      if (lead) {
        leadContext = `Lead: ${lead.contact_name ?? ""} at ${lead.company_name ?? ""} (${lead.role ?? "—"}). Stage: ${lead.status ?? "?"}. Score: ${lead.score ?? "?"}.`;
      }
    }

    const replyBody = (msg.body_text ?? msg.snippet ?? "").slice(0, 4000);

    const systemPrompt = `You are a senior B2B sales coach analyzing how a prospect replied to an outreach email.
Score the reply on a four-level temperature scale:
- "hot"      → ready to talk: asks for a meeting, pricing, demo; clearly interested
- "warm"     → curious / open: asks questions, requests info, wants to learn more
- "cold"     → polite no, "not now", "send info but no commitment", non-committal
- "neutral"  → out-of-office, autoresponder, wrong-person bounce, internal forward

Also detect the primary intent (one short label, e.g. "meeting_request", "pricing_question", "objection", "referral", "out_of_office", "unsubscribe", "rejection").
Then write a one-sentence summary and suggest ONE concrete next step the sender should take next.
Return JSON via the analyze_reply tool. Confidence is 0–1.`;

    const userPrompt = `${leadContext}\n\nReply subject: ${msg.subject ?? "(no subject)"}\nFrom: ${msg.from_name ?? ""} <${msg.from_email}>\n\nReply body:\n"""\n${replyBody}\n"""`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_reply",
              description: "Return structured reply analysis.",
              parameters: {
                type: "object",
                properties: {
                  temperature: { type: "string", enum: ["hot", "warm", "cold", "neutral"] },
                  intent: { type: "string" },
                  summary: { type: "string" },
                  suggested_next_step: { type: "string" },
                  confidence: { type: "number" },
                },
                required: ["temperature", "intent", "summary", "suggested_next_step", "confidence"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "analyze_reply" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      if (aiResp.status === 429) return json({ error: "Rate limit, try again shortly." }, 429);
      if (aiResp.status === 402) return json({ error: "Add AI credits in workspace settings." }, 402);
      return json({ error: "AI gateway error", detail: t }, 500);
    }
    const aiJson = await aiResp.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) return json({ error: "no tool call returned" }, 500);

    const args = JSON.parse(toolCall.function.arguments) as {
      temperature: "hot" | "warm" | "cold" | "neutral";
      intent: string;
      summary: string;
      suggested_next_step: string;
      confidence: number;
    };

    // Persist analysis on the message
    await admin
      .from("email_messages")
      .update({
        reply_temperature: args.temperature,
        reply_intent: args.intent,
        reply_summary: args.summary,
        suggested_next_step: args.suggested_next_step,
        analysis_confidence: args.confidence,
        analyzed_at: new Date().toISOString(),
      })
      .eq("id", messageId);

    // Roll up to lead, if linked
    if (thread?.lead_id) {
      // Count replies for this lead via threads
      const { data: leadThreads } = await admin
        .from("email_threads")
        .select("id")
        .eq("lead_id", thread.lead_id);
      const threadIds = (leadThreads ?? []).map((t) => t.id);
      let replyCount = 0;
      if (threadIds.length) {
        const { count } = await admin
          .from("email_messages")
          .select("id", { count: "exact", head: true })
          .in("thread_id", threadIds)
          .eq("direction", "inbound");
        replyCount = count ?? 0;
      }
      await admin
        .from("leads")
        .update({
          last_reply_at: msg.sent_at,
          last_reply_temperature: args.temperature,
          reply_count: replyCount,
        })
        .eq("id", thread.lead_id);
    }

    return json({ ok: true, analysis: args });
  } catch (e) {
    console.error("analyze-reply error", e);
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
