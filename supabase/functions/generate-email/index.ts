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
    const { workspace_id, lead_id, tone, meeting_attendees, meeting_type, meeting_description, awards, signature_override } = await req.json();
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Quota check (Free tier = 25 AI emails / month). Uses service role.
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    // Verify the caller is actually a member of the workspace before touching its quota.
    const { data: membership } = await admin
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const quota = await checkAiEmailQuota(admin, workspace_id);
    if (quota) {
      return new Response(
        JSON.stringify({ error: quota.reason, code: "quota_exceeded", ...quota }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const [{ data: company }, { data: lead }, { data: products }, { data: profile }] = await Promise.all([
      supabase.from("company_profiles").select("*").eq("workspace_id", workspace_id).maybeSingle(),
      supabase.from("leads").select("*").eq("id", lead_id).maybeSingle(),
      supabase.from("products").select("name, description").eq("workspace_id", workspace_id),
      supabase.from("profiles").select("full_name, email_signature, sender_name").eq("id", user.id).maybeSingle(),
    ]);
    if (!lead) throw new Error("Lead not found");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const senderName = company?.company_name ?? "our company";
    const senderDescription = company?.description ?? "";
    const senderProducts = products?.map((p: any) => `${p.name}${p.description ? ` — ${p.description}` : ""}`).join("; ") || company?.products_summary || "";
    const senderIndustries = (company?.industries ?? []).join(", ");
    const senderTargetSystems = (company?.target_systems ?? []).join(", ");
    const senderSolvedPains = (company?.solved_pain_points ?? []).join("; ");
    const senderPositioning = company?.positioning ?? "";

    const leadSystems = (lead.systems_in_use ?? []).join(", ");
    const leadPains = (lead.pain_points ?? []).join("; ");
    const leadTools = (lead.tools ?? []).join(", ");

    const repName = profile?.sender_name || profile?.full_name || "the team";

    const userPrompt = `Write a HYPER-PERSONALIZED B2B outreach email from ${senderName} (sender) to the recipient below. This must read like a thoughtful 1:1 message — not a template, not a generic pitch. The reader must instantly feel "this person actually understands my world".

═══════════════════════════════
SENDER (${senderName})
═══════════════════════════════
- About: ${senderDescription}
- Positioning / one-liner: ${senderPositioning}
- Products / services: ${senderProducts}
- Industries served: ${senderIndustries}
- Systems we replace OR integrate with (this is what our prospects are usually running today): ${senderTargetSystems || "(not specified)"}
- Pain points we typically solve: ${senderSolvedPains || "(not specified)"}
- Sender rep (signing the email): ${repName}

═══════════════════════════════
RECIPIENT
═══════════════════════════════
- Name: ${lead.contact_name ?? "(unknown)"}
- Role: ${lead.role ?? "(unknown)"}
- Company: ${lead.company_name}
- Industry: ${lead.industry ?? "(unknown)"}
- Systems / stack the prospect is currently using: ${leadSystems || "(unknown — infer cautiously from industry & role, do not invent specific vendor names)"}
- Tools mentioned: ${leadTools || "(none)"}
- Known pain points / signals about this prospect: ${leadPains || "(none provided — infer common ones for this role/industry)"}
- Free-text notes: ${lead.notes ?? "(none)"}

═══════════════════════════════
TONE: ${tone ?? "warm, professional, consultative"}
═══════════════════════════════

═══════════════════════════════
MEETING CONTEXT (from sender — use ONLY if provided, never fabricate)
═══════════════════════════════
- Meeting type: ${meeting_type || "(not specified — offer a brief virtual or in-person discussion generically)"}
- Who will join from sender side: ${meeting_attendees || "(not specified — may mention 'a senior colleague would be glad to join')"}
- Physical meeting / booth details: ${meeting_description || "(none)"}

═══════════════════════════════
COMPANY AWARDS / CREDENTIALS TO REFERENCE (use at most ONE, naturally — never invent)
═══════════════════════════════
${awards || "(none provided — skip social proof unless present in sender description)"}


WRITING RULES (follow strictly):

1. **Greeting**: "Dear <FirstName>," then one warm opener line ("Good day to you and we hope you are doing well.").

2. **Role-aware opening paragraph**: Acknowledge the recipient's role at their company in one sentence — describe the *vantage point* that role gives them ("As the <Role> at <Company>, you are in a unique position to see…"). Make it feel observed, not flattering.

3. **System-aware diagnostic paragraph (CRITICAL)**: This is what makes the email land. Reference the systems the prospect is running today (from "Systems / stack" above), and describe the *specific operational frictions* a person in their role experiences with that stack. Example pattern:
   "We know that <Company> is using <System(s)> for <areas>, and in environments like that, <role>s often struggle with <specific friction 1>, <specific friction 2>, and <specific friction 3>."
   - The frictions you list MUST be drawn from the recipient's known pain points OR from the sender's "Pain points we typically solve" list, filtered to the ones that are *actually relevant to this role*. A CFO cares about reconciliation, forecasting accuracy, closing cycles, real-time visibility into KPIs. A COO cares about throughput, downtime, fragmented operations. A CIO cares about integration debt, security, scaling, vendor sprawl. **Match pain points to the recipient's job — they should read it and think "yes, exactly".**
   - If the prospect's systems are unknown, say so gently ("In environments running multiple disconnected ERPs / legacy stacks…") — never fabricate a specific vendor name.

4. **Then-position paragraph**: Connect the sender's offering DIRECTLY to the frictions you just named. Use the sender's products and the "Systems we replace/integrate with" list. Be concrete about the mechanism (replacement, integration, middleware, automation, advisory).

5. **Soft, no-obligation ask**: Offer something with no commitment — a brief virtual or in-person discussion, a tailored walkthrough. Mention that a Director / senior colleague would be glad to join. Frame as "an initial discussion with no obligation".

6. **Social proof (optional, max 1 line)**: If the sender description contains credentials (partner status, awards, customer count, certifications) — weave ONE in naturally. Do not invent.

7. **Sign-off**: Close with "Thank you for your time, and I look forward to hearing from you." then on its own line "Wishing you a pleasant day ahead." Do NOT add a name, title, or signature block — those are appended automatically by the platform.

8. **Length**: 220–340 words. Multiple short paragraphs. Never a wall of text.

9. **Voice**: warm, respectful, slightly formal, never salesy. Banned words: "leverage", "synergy", "solutions provider", "game-changer", "revolutionary", "circle back", "touch base".

10. **Subject line**: 6–10 words. Specific. Reference either the recipient's company OR the specific friction the email diagnoses (e.g. "A thought on financial and operational data at <Company>"). No emojis. No "Quick question" / "Following up".

OUTPUT: Return ONLY the structured email via the tool call. Do not include any signature, name, or contact block — only greeting through the two closing lines.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: "You are an elite B2B sales copywriter who writes hyper-personalized 1:1 outreach. Your emails feel hand-written by a thoughtful senior account executive — never templated, never generic, never salesy. You ground every claim in the provided context. You map the sender's solutions onto the recipient's *actual systems and role-specific pain points*, and you NEVER fabricate vendor names, customer logos, metrics, or credentials." },
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
                body: { type: "string", description: "Email body, 220-340 words, multiple short paragraphs, starting with 'Dear <FirstName>,' and ending with 'Wishing you a pleasant day ahead.' No signature block." },
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

    // Append the user's signature: prefer explicit override from composer, fall back to saved profile signature.
    let body = args.body ?? "";
    const signature = ((signature_override ?? profile?.email_signature) ?? "").trim();
    if (signature) {
      body = `${body.trimEnd()}\n\n${signature}`;
    }

    // Count successful generation toward Free quota.
    await incrementAiEmails(admin, workspace_id);

    return new Response(JSON.stringify({ subject: args.subject, body }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
