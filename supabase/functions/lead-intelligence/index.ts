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

    // --- Optional: scrape public LinkedIn employee signals via Firecrawl ---
    type EmployeeSignal = { title: string; url: string; snippet: string };
    let employeeSignals: EmployeeSignal[] = [];
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (FIRECRAWL_API_KEY && lead.company_name) {
      try {
        const techKeywords =
          "(SAP OR Oracle OR Salesforce OR HubSpot OR Workday OR NetSuite OR ServiceNow OR Dynamics OR Snowflake OR Databricks OR AWS OR Azure OR Kubernetes OR Jira OR Zendesk OR Tableau OR PowerBI)";
        const linkedinScope = lead.linkedin_company_url
          ? `site:linkedin.com/in "${lead.company_name}"`
          : `site:linkedin.com/in "${lead.company_name}"`;
        const q = `${linkedinScope} ${techKeywords}`;
        const fcResp = await fetch("https://api.firecrawl.dev/v2/search", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: q, limit: 8 }),
        });
        if (fcResp.ok) {
          const fcJson = await fcResp.json();
          const results: any[] = fcJson?.data?.web ?? fcJson?.data ?? fcJson?.web ?? [];
          employeeSignals = results
            .filter((r: any) => typeof r?.url === "string" && r.url.includes("linkedin.com/in"))
            .slice(0, 6)
            .map((r: any) => ({
              title: String(r.title ?? "").slice(0, 200),
              url: String(r.url),
              snippet: String(r.description ?? r.snippet ?? "").slice(0, 400),
            }));
        } else {
          console.warn("Firecrawl search failed:", fcResp.status, await fcResp.text());
        }
      } catch (e) {
        console.warn("Firecrawl scrape error:", e);
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const employeeBlock = employeeSignals.length
      ? `\n\nPUBLIC LINKEDIN EMPLOYEE SIGNALS (scraped from public profile snippets — use as STRONG evidence; if a system is named here, mark its tech_stack confidence as "known"):\n` +
        employeeSignals.map((e, i) => `${i + 1}. ${e.title}\n   ${e.snippet}\n   ${e.url}`).join("\n")
      : "";


    const systemPrompt = `You are a senior B2B sales strategist + GTM researcher. Given a target LEAD company and the USER'S company profile, produce a sharp, actionable intelligence brief.

Always answer with concrete, specific phrasing — no fluff. Prefer short bullets. Name actual products and vendors where realistic (e.g. "Salesforce", "HubSpot", "Workday", "SAP SuccessFactors", "Zendesk", "Oracle PeopleSoft", "Banner SIS", "Moodle"). It is OK to infer from industry norms — mark inferences with confidence "likely".

Sections:
1. focus_areas: 4-8 products/services the LEAD focuses on.
2. tech_stack: list of systems/software the lead likely uses TODAY. Each item: { name, category (e.g. CRM, ERP, SIS, LMS, ATS, Helpdesk, Marketing, Analytics, Comms, Finance), is_competitor_of_user (true if it competes with USER's offering), confidence ("known"|"likely") }.
3. likely_processes: 4-8 bullets on how they operate today.
4. gaps: 3-6 bullets on what's lacking / painful.
5. pain_point_targets: for each major gap, suggest WHO inside the lead company to target. Each item: { pain_point, target_role, why, linkedin_search_url }. The linkedin_search_url MUST be a public LinkedIn people search built like: https://www.linkedin.com/search/results/people/?keywords=<URL-encoded "role company name">  — never fabricate a profile URL, only build the search URL.
6. fit_summary: 2-3 sentences on how USER's offering fits this lead.
7. contact_fit: "ideal" | "okay" | "wrong" for the CURRENT contact.
8. contact_reasoning: one sentence.
9. better_contacts: 2-4 better roles if fit isn't ideal, otherwise [].
10. opening_angles: 3 sharp hooks tailored to lead + user company.`;

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

For every linkedin_search_url, base the company keyword on "${lead.company_name}".${employeeBlock}`;

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
                focus_areas: { type: "array", items: { type: "string" } },
                tech_stack: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      category: { type: "string" },
                      is_competitor_of_user: { type: "boolean" },
                      confidence: { type: "string", enum: ["known", "likely"] },
                    },
                    required: ["name", "category", "is_competitor_of_user", "confidence"],
                  },
                },
                likely_processes: { type: "array", items: { type: "string" } },
                gaps: { type: "array", items: { type: "string" } },
                pain_point_targets: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      pain_point: { type: "string" },
                      target_role: { type: "string" },
                      why: { type: "string" },
                      linkedin_search_url: { type: "string" },
                    },
                    required: ["pain_point", "target_role", "why", "linkedin_search_url"],
                  },
                },
                fit_summary: { type: "string" },
                contact_fit: { type: "string", enum: ["ideal", "okay", "wrong"] },
                contact_reasoning: { type: "string" },
                better_contacts: { type: "array", items: { type: "string" } },
                opening_angles: { type: "array", items: { type: "string" } },
              },
              required: ["focus_areas", "tech_stack", "likely_processes", "gaps", "pain_point_targets", "fit_summary", "contact_fit", "contact_reasoning", "better_contacts", "opening_angles"],
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

    if (Array.isArray(args.pain_point_targets)) {
      args.pain_point_targets = args.pain_point_targets.map((t: any) => ({
        ...t,
        linkedin_search_url: `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${t.target_role ?? ""} ${lead.company_name}`.trim())}`,
      }));
    }

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
