import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { checkAiEmailQuota, incrementAiEmails } from "../_shared/entitlements.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResearchSource {
  title: string;
  url: string;
  snippet: string;
  type: "pdf" | "linkedin" | "web";
}

async function firecrawlSearch(query: string, limit = 4): Promise<ResearchSource[]> {
  const key = Deno.env.get("FIRECRAWL_API_KEY");
  if (!key) return [];
  try {
    const r = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit, tbs: "qdr:y" }),
    });
    if (!r.ok) return [];
    const data = await r.json();
    const results = data?.data?.web ?? data?.data ?? data?.web ?? [];
    return (Array.isArray(results) ? results : [])
      .map((x: any) => {
        const url = x.url ?? x.link ?? "";
        const lower = url.toLowerCase();
        const type: ResearchSource["type"] =
          lower.endsWith(".pdf") || lower.includes(".pdf?")
            ? "pdf"
            : lower.includes("linkedin.com")
            ? "linkedin"
            : "web";
        return {
          title: (x.title ?? "").toString().slice(0, 200),
          url,
          snippet: (x.description ?? x.snippet ?? "").toString().slice(0, 300),
          type,
        };
      })
      .filter((s: ResearchSource) => s.url);
  } catch {
    return [];
  }
}

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

    // === Research phase: pull public PDFs + LinkedIn posts + industry articles ===
    const industries: string[] = (company.industries ?? []).slice(0, 3);
    const systems: string[] = ((company as any).target_systems ?? []).slice(0, 3);
    const focusTerms = [...industries, ...systems].filter(Boolean);
    const topic = focusTerms.length ? focusTerms.join(" ") : company.company_name;
    const year = new Date().getFullYear();

    const queries = isReplace
      ? [
          `${topic} enterprise customers hiring ${year}`,
          `${topic} digital transformation case study ${year}`,
          `site:linkedin.com/company ${topic} ${year}`,
          `${topic} funding expansion announcement ${year}`,
          `${topic} ERP migration OR implementation ${year} filetype:pdf`,
        ]
      : [
          `${topic} top companies ${year}`,
          `${topic} market leaders ${year} filetype:pdf`,
          `${topic} largest enterprises ${year} annual report filetype:pdf`,
          `${topic} digital transformation case study ${year}`,
          `${topic} customers list reference ${year}`,
          `${topic} industry analysis Gartner OR Forrester ${year} filetype:pdf`,
          `site:linkedin.com/company ${topic}`,
          `site:linkedin.com/pulse ${topic} ${year}`,
          `${topic} hiring CIO OR CTO OR "head of IT" ${year}`,
          `${topic} M&A OR acquisition OR funding ${year}`,
        ];

    const researchResults = await Promise.all(queries.map((q) => firecrawlSearch(q, 6)));
    const dedup = new Map<string, ResearchSource>();
    researchResults.flat().forEach((s) => { if (!dedup.has(s.url)) dedup.set(s.url, s); });
    const sources = Array.from(dedup.values()).slice(0, 40);

    const sourcesBlock = sources.length
      ? sources.map((s, i) => `[${i + 1}] (${s.type}) ${s.title}\n    ${s.url}\n    ${s.snippet}`).join("\n")
      : "(no live sources — rely on training knowledge but stay real & specific)";

    const baseContext = `Company: ${company.company_name}
Description: ${company.description ?? ""}
Industries: ${(company.industries ?? []).join(", ")}
Products: ${products?.map((p: any) => p.name + ": " + (p.description ?? "")).join(" | ") || company.products_summary || ""}`;

    const sellerProducts = (products?.map((p: any) => p.name).filter(Boolean) || []) as string[];
    const sellerOffering = [...sellerProducts, ...((company as any).target_systems ?? [])].filter(Boolean);
    const exclusionRule = `CRITICAL EXCLUSION RULE: This seller offers/implements: ${sellerOffering.join(", ") || company.company_name}. Therefore the TARGETS list MUST NOT include:
- Vendors of the same product/category (e.g. if seller does IFS ERP, exclude IFS itself and other ERP vendors like SAP, Oracle, Microsoft Dynamics, Infor, Epicor, Workday, NetSuite, Sage, Odoo, etc.)
- Companies that sell, implement, consult on, integrate, resell, support, or compete with similar products/services
- Resellers, implementation partners, system integrators, IT consultancies, software vendors, VARs/MSPs, or solution providers for the seller's category
- Any IT-services firm or boutique whose name suggests services/consulting (e.g. ending in "Technologies", "Solutions", "Systems", "Services", "Consulting", "Labs", "Digital", "Infotech", "Softlabs")
- Direct competitors of the seller, including smaller regional providers/partners
Those belong in the 'similar' (competitors) list ONLY — never in 'targets'.

TARGETS MUST BE END-CUSTOMERS — real operating companies that would BUY/USE the seller's product (e.g. manufacturers, utilities, hospitals, airlines, retailers, banks, energy producers, telecoms, logistics operators, construction, defense, F&B). Their primary business must be making goods, operating infrastructure, or serving end consumers — NOT selling software, consulting, or implementation. If you cannot confidently say "this company is the BUYER, not a SELLER", drop it.

QUALITY BAR — each target must include:
- Real, verifiable company name + correct primary website
- A SPECIFIC 'problem' grounded in a recent public event (funding round, hiring spree, migration, M&A, regulatory change, expansion) — NOT a generic "needs ERP modernization"
- Real named ICP contacts with real /in/ LinkedIn URLs — if you cannot verify, return FEWER contacts rather than fabricate
- 1-3 references that are real, working URLs (LinkedIn company page, recent LinkedIn post/article, press release, annual-report PDF, Crunchbase, Wikipedia). If the LIVE SOURCES below contain a relevant URL for the company, REUSE that exact URL verbatim.`;
    const sourcingGuidance = `Use the LIVE SOURCES below (LinkedIn pages, PDFs, articles) as primary evidence. Each company you pick MUST include at least one reference URL — prefer linking back to the live sources by their URL when relevant. Real URLs only — never invent.

${exclusionRule}`;

    const userPrompt = isReplace
      ? `${baseContext}

${sourcingGuidance}

LIVE SOURCES:
${sourcesBlock}

Suggest exactly ONE NEW real specific END-CUSTOMER company this seller should target. It must be DIFFERENT from: ${excludeList.join(", ") || "(none)"}.
Include real name, website, uses_ifs guess, 2-5 current_systems, a SPECIFIC problem tied to a recent public event, 3-6 designations, 2-4 real named ICP contacts with real /in/ LinkedIn URLs (omit if unsure), focus areas, and 1-3 real verifiable references (mix LinkedIn / PDF / web). Return empty 'similar', single-item 'targets'.`
      : `${baseContext}

${sourcingGuidance}

LIVE SOURCES:
${sourcesBlock}

Generate competitor analysis AND 5-8 real specific END-CUSTOMER target companies (no IT services / consultancies / vendors). For each target: real name & website, uses_ifs (bool or null), 2-5 current_systems they actually run, a SPECIFIC problem grounded in a recent public event (funding, hiring, M&A, expansion, regulation), why-you-fit, 3-6 designations, 2-4 real named ICP contacts (full_name + role + real /in/ LinkedIn URL — omit if unverifiable), focus_areas, 1-3 real verifiable references. For similar/competitors: 3-5 with strengths/weaknesses/your_advantage and 1-2 references each.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a B2B market analyst for enterprise applications. Pick real target companies and competitors, grounded in the live sources provided. Never fabricate URLs or names. Always include a mix of LinkedIn, PDF, and web reference links." },
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
                        items: {
                          type: "object",
                          properties: {
                            label: { type: "string" },
                            url: { type: "string" },
                            type: { type: "string", enum: ["pdf", "linkedin", "web"] },
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
                  items: {
                    type: "object",
                    properties: {
                      company: { type: "string" },
                      website: { type: "string" },
                      industry: { type: "string" },
                      size: { type: "string" },
                      uses_ifs: { type: ["boolean", "null"] },
                      current_systems: { type: "array", items: { type: "string" } },
                      problem: { type: "string" },
                      why: { type: "string" },
                      designations: { type: "array", items: { type: "string" } },
                      icp_contacts: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            full_name: { type: "string" },
                            role: { type: "string" },
                            linkedin_url: { type: "string" },
                          },
                          required: ["full_name", "role", "linkedin_url"],
                        },
                      },
                      focus_areas: { type: "array", items: { type: "string" } },
                      references: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            label: { type: "string" },
                            url: { type: "string" },
                            type: { type: "string", enum: ["pdf", "linkedin", "web"] },
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
    if (!response.ok) {
      const t = await response.text();
      console.error("AI error", response.status, t);
      throw new Error("AI gateway error");
    }

    const json = await response.json();
    const args = JSON.parse(json.choices[0].message.tool_calls[0].function.arguments);

    // Backfill type if the model forgot, based on URL
    const classify = (url: string): "pdf" | "linkedin" | "web" => {
      const l = (url ?? "").toLowerCase();
      if (l.endsWith(".pdf") || l.includes(".pdf?")) return "pdf";
      if (l.includes("linkedin.com")) return "linkedin";
      return "web";
    };
    const fixRefs = (arr: any[]) => (arr ?? []).map((r: any) => ({ ...r, type: r?.type ?? classify(r?.url ?? "") }));
    (args.similar ?? []).forEach((s: any) => { s.references = fixRefs(s.references); });
    (args.targets ?? []).forEach((t: any) => { t.references = fixRefs(t.references); });

    // Filter out competitor/vendor/implementation-partner companies that slipped into targets
    const normalize = (value: unknown) => (value ?? "").toString().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const competitorNames = new Set<string>(
      (args.similar ?? [])
        .map((s: any) => normalize(s.name ?? s.company))
        .filter(Boolean)
    );
    const offeringText = normalize([
      ...sellerOffering,
      company.products_summary,
      company.description,
      ...(products ?? []).flatMap((p: any) => [p.category, p.description]),
    ].filter(Boolean).join(" "));
    const enterpriseVendors = ["ifs", "sap", "oracle", "microsoft dynamics", "dynamics", "infor", "epicor", "workday", "netsuite", "sage", "odoo", "salesforce", "servicenow", "siemens plm", "hubspot", "zoho"];
    const providerSignals = ["implementation partner", "implement", "implementation", "reseller", "system integrator", "systems integrator", "integrator", "consultancy", "consulting", "it services", "software development", "software vendor", "solution provider", "solutions provider", "managed service", "msp", "var", "partner", "digital transformation", "erp consultant", "crm consultant"];
    const serviceNameSuffixes = ["technologies", "technology", "solutions", "systems", "services", "consulting", "consultancy", "labs", "digital", "infotech", "softlabs", "soft", "informatics", "softech", "tech", "global services", "softwares", "software"];
    const sellerVendorSignals = enterpriseVendors.filter((vendor) => offeringText.includes(normalize(vendor)));
    const isCompetitor = (t: any): boolean => {
      const name = normalize(t.company ?? t.type);
      if (!name) return false;
      if (competitorNames.has(name)) return true;
      const sellerName = normalize(company.company_name);
      if (sellerName && (name.includes(sellerName) || sellerName.includes(name))) return true;

      const targetText = normalize([
        t.company,
        t.type,
        t.website,
        t.industry,
        t.problem,
        t.why,
        ...(t.current_systems ?? []),
        ...(t.focus_areas ?? []),
        ...(t.designations ?? []),
        ...((t.icp_contacts ?? []).flatMap((c: any) => [c?.role, c?.full_name])),
      ].filter(Boolean).join(" "));

      if (sellerVendorSignals.some((vendor) => name.includes(normalize(vendor)))) return true;
      // Name ends with a services-firm suffix word
      const nameTokens = name.split(" ").filter(Boolean);
      const lastToken = nameTokens[nameTokens.length - 1] ?? "";
      if (serviceNameSuffixes.includes(lastToken)) return true;
      const isProvider = providerSignals.some((signal) => targetText.includes(normalize(signal)));
      const mentionsSellerCategory = sellerVendorSignals.some((vendor) => targetText.includes(normalize(vendor))) || /\berp\b|\bcrm\b|enterprise application|business software|cloud software/.test(targetText);
      return isProvider && mentionsSellerCategory;
    };
    if (Array.isArray(args.targets)) {
      args.targets = args.targets.filter((t: any) => !isCompetitor(t));
    }

    await incrementAiEmails(admin, workspace_id);

    await supabase.from("activities").insert({
      workspace_id, user_id: user.id, type: "targets_generated",
      description: `AI generated ${args.targets?.length ?? 0} targets and ${args.similar?.length ?? 0} competitor profiles`,
    });

    return new Response(JSON.stringify(args), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e?.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
