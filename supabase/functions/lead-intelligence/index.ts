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
    const { lead_id } = await req.json();
    if (!lead_id) {
      return new Response(JSON.stringify({ error: "lead_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: lead, error: leadErr } = await admin
      .from("leads").select("*").eq("id", lead_id).maybeSingle();
    if (leadErr || !lead) throw new Error("Lead not found");

    const { data: membership } = await admin
      .from("workspace_members").select("user_id")
      .eq("workspace_id", lead.workspace_id).eq("user_id", user.id).maybeSingle();
    if (!membership) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const quota = await checkAiEmailQuota(admin, lead.workspace_id);
    if (quota) {
      return new Response(JSON.stringify({ error: quota.reason, code: "quota_exceeded", ...quota }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: company } = await admin
      .from("company_profiles").select("*")
      .eq("workspace_id", lead.workspace_id).maybeSingle();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const systemPrompt = `You are a senior B2B sales strategist. Given a target LEAD company and the USER'S company profile, produce a sharp, actionable intelligence brief.

Always answer with concrete, specific phrasing — no fluff. Prefer short bullets.

Sections to fill:
1. focus_areas: products/services the LEAD company is focused on (inferred from public signals).
2. likely_processes: how this lead likely operates today (workflows, tools, vendors).
3. gaps: what's likely lacking or painful that the USER'S company can address.
4. fit_summary: 2-3 sentences on how the user's offering specifically fits this lead.
5. contact_fit: judge if the CURRENT contact is the right person to receive outreach. Values: "ideal" | "okay" | "wrong".
6. contact_reasoning: one short sentence explaining the verdict.
7. better_contacts: if contact_fit is "okay" or "wrong", list 2-4 better roles/titles to reach (e.g., "VP Engineering", "Head of RevOps"). Otherwise [].
8. opening_angles: 3 sharp angles/hooks to open the conversation, tailored to this lead + user's company.`;

    const userPrompt = `LEAD COMPANY:
Name: ${lead.company_name}
Industry: ${lead.industry ?? "unknown"}
Country: ${lead.country ?? "unknown"}
Current contact: ${lead.contact_name ?? "unknown"}${lead.role ? ` (${lead.role})` : ""}
Email: ${lead.email ?? "unknown"}
Known systems: ${(lead.systems_in_use ?? []).join(", ") || "none recorded"}
Known pain points: ${(lead.pain_points ?? []).join(", ") || "none recorded"}
Notes: ${lead.notes ?? "none"}

USER'S COMPANY (the one doing outreach):
Name: ${company?.company_name ?? "unknown"}
Description: ${company?.description ?? "—"}
Products/Services: ${company?.products_summary ?? "—"}
Industries served: ${(company?.industries ?? []).join(", ") || "—"}
Target systems we plug into: ${(company?.target_systems ?? []).join(", ") || "—"}
Pain points we solve: ${(company?.solved_pain_points ?? []).join(", ") || "—"}
Positioning: ${company?.positioning ?? "—"}

Produce the intelligence brief.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "save_intelligence",
            description: "Return the structured lead intelligence brief.",
            parameters: {
              type: "object",
              properties: {
                focus_areas: { type: "array", items: { type: "string" }, description: "4-8 short bullets of products/services lead focuses on" },
                likely_processes: { type: "array", items: { type: "string" }, description: "4-8 bullets on how they operate today" },
                gaps: { type: "array", items: { type: "string" }, description: "3-6 bullets on what's lacking" },
                fit_summary: { type: "string" },
                contact_fit: { type: "string", enum: ["ideal", "okay", "wrong"] },
                contact_reasoning: { type: "string" },
                better_contacts: { type: "array", items: { type: "string" } },
                opening_angles: { type: "array", items: { type: "string" }, description: "3 sharp opener hooks" },
              },
              required: ["focus_areas", "likely_processes", "gaps", "fit_summary", "contact_fit", "contact_reasoning", "better_contacts", "opening_angles"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "save_intelligence" } },
      }),
    });

    if (aiResp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit hit. Try again in a minute." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiResp.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Workspace settings." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI error:", aiResp.status, t);
      throw new Error("AI gateway error");
    }

    const json = await aiResp.json();
    const args = JSON.parse(json.choices[0].message.tool_calls[0].function.arguments);

    await incrementAiEmails(admin, lead.workspace_id);

    return new Response(JSON.stringify(args), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e?.message ?? "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
