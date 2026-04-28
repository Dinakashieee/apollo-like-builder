import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { checkAiEmailQuota, incrementAiEmails } from "../_shared/entitlements.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { workspace_id, lead_id, tone } = await req.json();
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Quota check (Free tier = 20 AI emails / month). Uses service role.
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const quota = await checkAiEmailQuota(admin, workspace_id);
    if (quota) {
      return new Response(
        JSON.stringify({ error: quota.reason, code: "quota_exceeded", ...quota }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const [{ data: company }, { data: lead }, { data: products }] = await Promise.all([
      supabase.from("company_profiles").select("*").eq("workspace_id", workspace_id).maybeSingle(),
      supabase.from("leads").select("*").eq("id", lead_id).maybeSingle(),
      supabase.from("products").select("name, description").eq("workspace_id", workspace_id),
    ]);
    if (!lead) throw new Error("Lead not found");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const senderName = company?.company_name ?? "our company";
    const senderDescription = company?.description ?? "";
    const senderProducts = products?.map((p: any) => `${p.name}${p.description ? ` — ${p.description}` : ""}`).join("; ") || company?.products_summary || "";
    const senderIndustries = (company?.industries ?? []).join(", ");

    const userPrompt = `Write a HYPER-PERSONALIZED B2B outreach email from ${senderName} to the recipient below. This must read like a thoughtful 1:1 message — not a template, not a generic pitch.

═══════════════════════════════
SENDER (${senderName})
═══════════════════════════════
- About: ${senderDescription}
- Products / services: ${senderProducts}
- Industries served: ${senderIndustries}

═══════════════════════════════
RECIPIENT
═══════════════════════════════
- Name: ${lead.contact_name ?? "(unknown)"}
- Role: ${lead.role ?? "(unknown)"}
- Company: ${lead.company_name}
- Industry: ${lead.industry ?? "(unknown)"}
- Notes / signals: ${lead.notes ?? "(none provided)"}

═══════════════════════════════
TONE: ${tone ?? "warm, professional, consultative"}
═══════════════════════════════

WRITING RULES (follow strictly):
1. Greeting: address the recipient by first name only ("Dear <FirstName>,") followed by a warm one-line opener ("Good day to you and we hope you are doing well.").
2. Reference: explicitly reference the recipient's situation in the second paragraph — name their company, their likely systems/stack, the kind of project environment they're in, and the specific challenges that role typically faces. Use the notes above to ground this — DO NOT invent named tools, named people, or facts that contradict the notes.
3. Diagnose, then position: spend 1 paragraph empathetically describing the kinds of operational frictions someone in that role/industry typically faces (data reconciliation, manual effort, fragmented systems, visibility gaps, scaling complexity, etc.). Phrase as observations, not assumptions ("In environments like this, teams often find…", "This can sometimes lead to…").
4. Then 1 paragraph on how ${senderName} specifically helps — tie the sender's products/services directly to the frictions you just named. Be concrete about the mechanism (integration, automation, middleware, enhancement, advisory, etc.).
5. Soft, low-friction ask: offer something with no obligation (a no-cost assessment, a brief virtual or in-person discussion, a tailored walkthrough). Mention that a senior colleague / director would be glad to join. Frame as "an initial discussion with no obligation".
6. If the sender has any credentials in their description (partner status, awards, certifications, customer count) — weave ONE in naturally as social proof. Do not invent credentials.
7. Close with: "Thank you for your time, and I look forward to hearing from you." then "Wishing you a pleasant day ahead." on its own line.
8. Length: 220–320 words. Long enough to feel considered, short enough to be respectful. Multiple short paragraphs, NOT a wall of text.
9. Voice: warm, respectful, slightly formal, never salesy, never use words like "leverage", "synergy", "solutions provider", "game-changer", "revolutionary".
10. Subject line: specific, curiosity-driven, references either the recipient's company or a specific outcome. 6–10 words. No emojis. No "Quick question" / "Following up".

OUTPUT: Return ONLY the structured email via the tool call.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: "You are an elite B2B sales copywriter who writes hyper-personalized 1:1 outreach. Your emails feel hand-written by a thoughtful senior account executive — never templated, never generic, never salesy. You ground every claim in the provided context and never fabricate names, tools, metrics, or credentials." },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "draft_email",
            parameters: {
              type: "object",
              properties: {
                subject: { type: "string", description: "Specific, curiosity-driven subject line, 6-10 words." },
                body: { type: "string", description: "The full email body, 220-320 words, multiple short paragraphs, starting with 'Dear <FirstName>,' and ending with 'Wishing you a pleasant day ahead.'" },
              },
              required: ["subject", "body"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "draft_email" } },
      }),
    });

    if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!response.ok) throw new Error("AI error");

    const json = await response.json();
    const args = JSON.parse(json.choices[0].message.tool_calls[0].function.arguments);

    // Count successful generation toward Free quota.
    await incrementAiEmails(admin, workspace_id);

    return new Response(JSON.stringify(args), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
