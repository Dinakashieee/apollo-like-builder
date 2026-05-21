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
    const { workspace_id, mode, exclude } = await req.json();
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const quota = await checkAiEmailQuota(admin, workspace_id);
    if (quota) {
      return new Response(JSON.stringify({ error: quota.reason, code: "quota_exceeded", ...quota }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: company } = await supabase
      .from("company_profiles").select("*").eq("workspace_id", workspace_id).maybeSingle();
    if (!company) throw new Error("Add a company profile first");

    const { data: products } = await supabase
      .from("products").select("name, description, category").eq("workspace_id", workspace_id);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const isReplace = mode === "replace";
    const excludeList: string[] = Array.isArray(exclude) ? exclude.filter(Boolean) : [];

    const baseContext = `Company: ${company.company_name}
Description: ${company.description ?? ""}
Industries: ${(company.industries ?? []).join(", ")}
Products: ${products?.map((p: any) => p.name + ": " + (p.description ?? "")).join(" | ") || company.products_summary || ""}`;

    const apprtwGuidance = `PRIMARY SOURCE: Apps Run The World (https://www.appsruntheworld.com).
Treat Apps Run The World as the authoritative source for: enterprise applications customer wins/losses, ERP/CRM/HCM/SCM vendor market share, customer install bases, top customers by vendor, and "who uses what" intelligence. Their vendor pages (e.g. https://www.appsruntheworld.com/top-10-erp-software-vendors), customer database, and Top 500 Applications Vendors rankings should drive your picks.
SECONDARY SOURCE: Google web search results (https://www.google.com/search) — ONLY use this when Apps Run The World does not cover the company / vendor / data point. Prefer authoritative Google results: official site, Wikipedia, Crunchbase, Bloomberg, Reuters, Forbes, TechCrunch, official press releases, LinkedIn company page, job postings on careers sites.
RULES:
- Always TRY Apps Run The World first. Only fall back to Google when ART W has no entry for that company or data point.
- Prefer companies that appear in Apps Run The World customer lists / case studies for IFS competitors (SAP, Oracle, Microsoft Dynamics, Infor, Epicor, Workday, Sage, Unit4, IFS itself) — they are the strongest replacement / cross-sell targets.
- For uses_ifs and current_systems, base the answer on Apps Run The World customer database entries when possible; only fall back to Google-sourced public evidence (press releases, job postings, case studies) if ART W has no entry.
- References must include at least ONE Apps Run The World URL when ART W has data; otherwise include at least one Google-discoverable authoritative URL (Wikipedia, Crunchbase, official site, major press) and label it clearly. Use real URLs only — never invent ART W slugs or Google result URLs.
- Industry, size and current_systems should match ART W when available, else the best authoritative Google source.`;

    const userPrompt = isReplace
      ? `${baseContext}

${apprtwGuidance}

Suggest exactly ONE NEW specific real company this seller should target, sourced from Apps Run The World intelligence wherever possible. It must be DIFFERENT from these already-shown companies: ${excludeList.join(", ") || "(none)"}.
Include the real company name & website, uses_ifs (boolean or null), 2-5 current_systems (per ART W when available), why they are a fit, designations to pitch, 2-4 real named ICP contacts with real /in/ LinkedIn URLs (omit if unknown), focus areas, and 1-3 reference links — at least one must be an Apps Run The World URL. Never invent URLs or names. Return an empty 'similar' array — fill only 'targets' with that single new company.`
      : `${baseContext}

${apprtwGuidance}

Generate competitor analysis AND specific real target companies, drawing primarily from Apps Run The World vendor + customer intelligence. For each target:
- real company name & website
- USES_IFS: best-guess boolean (prefer ART W customer DB evidence; fall back to public sources). null if genuinely unknown.
- CURRENT_SYSTEMS: 2-5 ERP / CRM / HCM / SCM / middleware systems per Apps Run The World (e.g. "SAP S/4HANA", "Salesforce", "Microsoft Dynamics 365", "Oracle NetSuite", "Workday", "Infor CloudSuite"). Empty if unknown.
- WHY they are a fit (concrete reason, ideally citing an ART W finding such as "Oracle EBS customer flagged for modernization")
- DESIGNATIONS / job titles to pitch
- ICP_CONTACTS: 2-4 real named individuals with full_name, role, and real https://www.linkedin.com/in/... URL. Omit unverifiable slots — never invent.
- FOCUS AREAS / departments / use-cases
- 1-3 REFERENCE LINKS — at least ONE must be an Apps Run The World URL. Others may be official site, recent news, Crunchbase, Wikipedia. Real URLs only.
For SIMILAR (competitor) entries: use Apps Run The World's Top 10 ERP / Top 500 Apps Vendors rankings to pick realistic IFS competitors, and include at least one ART W reference URL per competitor.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: "You are a B2B market analyst specializing in enterprise applications (ERP/CRM/HCM/SCM). Your PRIMARY research source is Apps Run The World (appsruntheworld.com) — their vendor pages, customer database, and Top 500 Applications Vendors rankings. Provide realistic competitive analysis AND name specific real target companies. Back every pick with at least one Apps Run The World reference URL when possible, plus other verifiable links (official homepages, Wikipedia, Crunchbase, well-known press). Never fabricate URLs, ART W slugs, or company names." },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "save_targets",
            parameters: {
              type: "object",
              properties: {
                similar: {
                  type: "array",
                  description: "3-5 similar/competitive products",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      category: { type: "string" },
                      strengths: { type: "array", items: { type: "string" } },
                      weaknesses: { type: "array", items: { type: "string" } },
                      audience: { type: "string" },
                      your_advantage: { type: "string" },
                      references: {
                        type: "array",
                        description: "1-2 verifiable URLs about this competitor (homepage, Wikipedia, Crunchbase).",
                        items: {
                          type: "object",
                          properties: {
                            label: { type: "string" },
                            url: { type: "string" },
                          },
                          required: ["label", "url"],
                        },
                      },
                    },
                    required: ["name", "category", "strengths", "weaknesses", "audience", "your_advantage", "references"],
                  },
                },
                targets: {
                  type: "array",
                  description: "5-8 specific real companies to target",
                  items: {
                    type: "object",
                    properties: {
                      company: { type: "string", description: "Real company name" },
                      website: { type: "string", description: "Official website URL" },
                      industry: { type: "string" },
                      size: { type: "string", description: "e.g. 'Mid-market (200-1000)', 'Enterprise (5000+)'" },
                      uses_ifs: { type: ["boolean", "null"], description: "True if known IFS customer, false if known to use a competitor ERP, null if unknown." },
                      current_systems: {
                        type: "array",
                        description: "2-5 ERP/CRM/middleware/business systems this company publicly uses. Empty if unknown.",
                        items: { type: "string" },
                      },
                      problem: { type: "string", description: "Specific pain this company likely has" },
                      why: { type: "string", description: "Why this seller is a fit — concrete reason" },
                      designations: {
                        type: "array",
                        description: "3-6 job titles/designations to pitch (e.g. 'VP of Sales', 'Head of Revenue Operations')",
                        items: { type: "string" },
                      },
                      icp_contacts: {
                        type: "array",
                        description: "2-4 real named decision makers at this company matching the designations. Each must have a real LinkedIn profile URL. Omit slots you cannot verify — never invent.",
                        items: {
                          type: "object",
                          properties: {
                            full_name: { type: "string" },
                            role: { type: "string", description: "Current job title" },
                            linkedin_url: { type: "string", description: "Real https://www.linkedin.com/in/... profile URL" },
                          },
                          required: ["full_name", "role", "linkedin_url"],
                        },
                      },
                      focus_areas: {
                        type: "array",
                        description: "3-5 departments / use-cases / pitch angles (e.g. 'Outbound SDR team efficiency', 'Pipeline forecasting')",
                        items: { type: "string" },
                      },
                      references: {
                        type: "array",
                        description: "1-3 reference links so the user can verify (homepage, recent news, careers, funding announcement, Crunchbase, Wikipedia).",
                        items: {
                          type: "object",
                          properties: {
                            label: { type: "string", description: "Short label e.g. 'Official site', 'Series C funding (TechCrunch)', 'Careers'" },
                            url: { type: "string" },
                          },
                          required: ["label", "url"],
                        },
                      },
                      level: { type: "string", enum: ["high", "medium", "low"] },
                    },
                    required: ["company", "website", "industry", "size", "uses_ifs", "current_systems", "problem", "why", "designations", "icp_contacts", "focus_areas", "references", "level"],
                  },
                },
              },
              required: ["similar", "targets"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "save_targets" } },
      }),
    });

    if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit. Try again." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!response.ok) throw new Error("AI gateway error");

    const json = await response.json();
    const args = JSON.parse(json.choices[0].message.tool_calls[0].function.arguments);

    await incrementAiEmails(admin, workspace_id);

    await supabase.from("activities").insert({
      workspace_id, user_id: user.id, type: "targets_generated",
      description: `AI generated ${args.targets?.length ?? 0} targets and ${args.similar?.length ?? 0} competitor profiles`,
    });

    return new Response(JSON.stringify(args), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
