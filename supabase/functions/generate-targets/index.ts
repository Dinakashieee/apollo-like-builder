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
  priority?: "appsruntheworld" | "standard";
}

interface GenerationBody {
  workspace_id?: string;
  mode?: string;
  exclude?: unknown;
  async?: boolean;
}

class HttpError extends Error {
  status: number;
  payload: Record<string, unknown>;

  constructor(message: string, status = 500, payload?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.payload = payload ?? { error: message };
  }
}

async function firecrawlSearch(query: string, limit = 4): Promise<ResearchSource[]> {
  const key = Deno.env.get("FIRECRAWL_API_KEY");
  if (!key) return [];
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 8000); // hard cap so slow searches don't stall generation
  try {
    const r = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit, tbs: "qdr:y" }),
      signal: ctrl.signal,
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
  } finally {
    clearTimeout(timeout);
  }
}


async function processTargetGeneration(body: GenerationBody, authHeader: string, jobId?: string) {
  const { workspace_id, mode, exclude } = body;
  if (!workspace_id || typeof workspace_id !== "string") {
    throw new HttpError("Missing workspace_id", 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const updateJob = async (patch: Record<string, unknown>) => {
    if (!jobId) return;
    const { error } = await admin.from("target_generation_jobs").update(patch).eq("id", jobId);
    if (error) console.error("target_generation_jobs update failed", error.message);
  };

  try {
    await updateJob({ status: "running", progress: 10, message: "Checking workspace profile" });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new HttpError("Unauthorized", 401);

    const quota = await checkAiEmailQuota(admin, workspace_id);
    if (quota) {
      throw new HttpError(quota.reason, 402, { error: quota.reason, code: "quota_exceeded", ...quota });
    }

    await updateJob({ progress: 18, message: "Reading company profile" });

    const { data: company } = await supabase
      .from("company_profiles").select("*").eq("workspace_id", workspace_id).maybeSingle();
    if (!company) throw new Error("Add a company profile first");

    const { data: products } = await supabase
      .from("products").select("name, description, category").eq("workspace_id", workspace_id);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const isReplace = mode === "replace";
    const excludeList: string[] = Array.isArray(exclude) ? exclude.filter(Boolean) : [];

    // === Derive seller category dynamically from the company profile ===
    const sellerProducts = (products?.map((p: any) => p.name).filter(Boolean) || []) as string[];
    const sellerCategories = (products?.map((p: any) => p.category).filter(Boolean) || []) as string[];
    const targetSystemsList: string[] = ((company as any).target_systems ?? []).filter(Boolean);
    const sellerOffering = [...sellerProducts, ...sellerCategories, ...targetSystemsList].filter(Boolean);

    // Build a short category descriptor (e.g. "IFS ERP implementation", "Cybersecurity SaaS", "Logistics platform")
    // entirely from the user's own profile — no hardcoded vertical.
    const sellerCategoryDescriptor = [
      sellerCategories[0],
      targetSystemsList[0],
      sellerProducts[0],
    ].filter(Boolean).join(" / ") || company.company_name;

    // === Research phase: pull public PDFs + LinkedIn posts + industry articles ===
    const industries: string[] = (company.industries ?? []).slice(0, 3);
    const systems: string[] = targetSystemsList.slice(0, 3);
    const focusTerms = [...industries, ...systems].filter(Boolean);
    const topic = focusTerms.length ? focusTerms.join(" ") : company.company_name;
    const year = new Date().getFullYear();

    const cleanSearchTerm = (value: unknown) => (value ?? "")
      .toString()
      .replace(/[“”]/g, '"')
      .replace(/\s+/g, " ")
      .trim();
    const sourceHints = Array.from(new Set([
      ...systems,
      ...sellerCategories,
      ...sellerProducts,
      sellerCategoryDescriptor,
    ].map(cleanSearchTerm).filter(Boolean))).slice(0, 5);
    const industryHints = industries.map(cleanSearchTerm).filter(Boolean);
    const primarySystem = sourceHints[0] || sellerCategoryDescriptor;
    const primaryIndustry = industryHints[0] || topic;

    // Quality-first queries — parallel + 8s timeout each, so latency stays bounded.
    // We deliberately include executive-targeting searches so the model has real named
    // contacts (CFO / CIO / VP) with real /in/ LinkedIn URLs to ground on.
    const appsRunTheWorldQueries = isReplace
      ? [
          `site:appsruntheworld.com ${primaryIndustry} ${primarySystem} customer`,
          `site:appsruntheworld.com ${topic} ${primarySystem} installed base`,
        ]
      : [
          `site:appsruntheworld.com ${primaryIndustry} ${primarySystem} customers`,
          `site:appsruntheworld.com ${topic} ${primarySystem} installed base`,
          `site:appsruntheworld.com ${primaryIndustry} ERP CRM HCM SCM customers`,
          `site:appsruntheworld.com "${primarySystem}" "customer"`,
        ];

    const queries = isReplace
      ? [
          `${topic} ${sellerCategoryDescriptor} customer ${year}`,
          `${topic} funding OR hiring OR expansion ${year}`,
          `site:linkedin.com/in "${topic}" (CFO OR CIO OR "VP" OR "Chief Information Officer")`,
        ]
      : [
          `${topic} top companies ${year}`,
          `${topic} ${sellerCategoryDescriptor} customers ${year}`,
          `site:linkedin.com/company ${topic}`,
          `site:linkedin.com/in "${topic}" (CFO OR CIO OR "Chief Financial Officer" OR "Chief Information Officer")`,
          `${topic} ${year} "annual report" filetype:pdf`,
          `${topic} funding OR M&A OR expansion ${year}`,
        ];

    await updateJob({ progress: 28, message: "Searching AppsRunTheWorld customer sources" });
    const appsRunTheWorldResults = await Promise.all(
      appsRunTheWorldQueries.map((q) => firecrawlSearch(q, isReplace ? 4 : 6))
    );
    const prioritizedArtSources = appsRunTheWorldResults.flat().map((source) => ({
      ...source,
      priority: "appsruntheworld" as const,
      type: "web" as const,
    }));

    await updateJob({ progress: 38, message: "Cross-checking LinkedIn, PDFs, and market news" });
    const researchResults = await Promise.all(queries.map((q) => firecrawlSearch(q, 5)));
    const dedup = new Map<string, ResearchSource>();
    [...prioritizedArtSources, ...researchResults.flat()].forEach((s) => { if (!dedup.has(s.url)) dedup.set(s.url, s); });
    const sources = Array.from(dedup.values()).slice(0, 40);


    const sourcesBlock = sources.length
      ? sources.map((s, i) => `[${i + 1}] (${s.priority === "appsruntheworld" ? "APPsRunTheWorld priority source" : s.type}) ${s.title}\n    ${s.url}\n    ${s.snippet}`).join("\n")
      : "(no live sources — rely on training knowledge but stay real & specific)";

    const baseContext = `Company: ${company.company_name}
Description: ${company.description ?? ""}
Industries: ${(company.industries ?? []).join(", ")}
Products / Offering: ${products?.map((p: any) => p.name + ": " + (p.description ?? "")).join(" | ") || company.products_summary || ""}
Target systems / categories the seller works with: ${targetSystemsList.join(", ") || "(not specified)"}
Derived seller category: ${sellerCategoryDescriptor}`;

    const exclusionRule = `CRITICAL EXCLUSION RULE — derive this seller's category from the profile above (do NOT assume any specific vertical like IFS/SAP/ERP unless the profile says so). This seller offers/implements: ${sellerOffering.join(", ") || company.company_name}. The TARGETS list MUST NOT include:
- Vendors of the same product/category as the seller (whatever that category is — ERP, CRM, cybersecurity, logistics SaaS, marketing tools, fintech APIs, etc.)
- Companies that sell, implement, consult on, integrate, resell, support, or compete with similar products/services in the seller's category
- Resellers, implementation partners, system integrators, IT consultancies, software vendors, VARs/MSPs, or solution providers for the seller's category
- Any services / consulting firm whose name suggests services (e.g. ending in "Technologies", "Solutions", "Systems", "Services", "Consulting", "Labs", "Digital", "Infotech", "Softlabs") UNLESS the seller's own offering is targeted at services firms
- Direct competitors of the seller, including smaller regional providers/partners
Those belong in the 'similar' (competitors) list ONLY — never in 'targets'.

TARGETS MUST BE END-CUSTOMERS that fit the seller's actual ICP based on the profile. Look at the seller's description, products, and industries to decide who the buyer is. If the seller sells to manufacturers, list manufacturers. If they sell to hospitals, list hospitals. If they sell to e-commerce brands, list e-commerce brands. If they sell to law firms, list law firms. Never default to a generic "enterprise" list — match the buyer profile to the seller's stated industries and product description.

QUALITY BAR — each target must include:
- Real, verifiable company name + correct primary website
- A SPECIFIC 'problem' grounded in a recent public event (funding round, hiring spree, migration, M&A, regulatory change, expansion) — written in the language of the seller's category (NOT generic "needs modernization"). Mine the target's website, LinkedIn posts, press releases, job ads, annual reports, and news mentions for the pain.
- Real named ICP contacts pulled from **LinkedIn profiles** (real /in/ URLs) and cross-referenced with the **SignalHire subscription database** for verified work emails — if you cannot verify a contact on LinkedIn, return FEWER contacts rather than fabricate. Every contact MUST have a real /in/ LinkedIn URL.
- 1-3 references that are real, working URLs (LinkedIn company page, recent post/article, press release, annual-report PDF, Crunchbase, Wikipedia). If the LIVE SOURCES below contain a relevant URL for the company, REUSE that exact URL verbatim.
- 'uses_ifs' field actually means "is this target already using something in the seller's category?" — true if they already run a competing/adjacent product (potential rip-and-replace / partnership-switch), false if they are a greenfield / net-new opportunity, null if unknown.
- 'current_systems' — list the actual named products/services they currently use that overlap with what THIS seller offers (e.g. "Salesforce CRM", "SAP S/4HANA", "HubSpot Marketing Hub"). Pull from job ads, case studies, vendor logo pages, integration listings, tech-stack databases. Do NOT invent.
- 'pitch_angle' — one of "switch" (already on a competing product → pitch partnership change / migration / consolidation), "expansion" (already a customer of a similar product → pitch add-on / replacement of a module), "greenfield" (no current solution → pitch net-new adoption). Derive from current_systems + uses_ifs.
- 'pain_points' — 2-4 SPECIFIC pains inferred from public evidence (e.g. "scaling support team after Series B — legacy ticketing can't handle multilingual queues", "M&A integration of 3 ERPs creates duplicate master data"). Tie each pain to a source when possible. Never generic.
- 'talking_points' — 3-5 ready-to-use conversation openers the seller can drop straight into an email. Each line must reference a SPECIFIC fact about the target (a hire, launch, funding, post, tech-stack item) and connect it to the seller's product. Write them in first-person sales voice, e.g. "Saw your VP Engineering post about migrating off Zendesk — we helped [similar company] cut response time 38% on the same move." Output as an array of standalone sentences.`;

    const sourcingGuidance = `Use the LIVE SOURCES below as primary evidence. APPsRunTheWorld priority sources are the strongest signals for verified software customers / installed-base clues and should be used before generic web results when relevant. Each company you pick MUST include at least one reference URL — prefer linking back to the live sources by their URL when relevant. Real URLs only — never invent.

Cross-check rule: mark a target as level "high" only when it is supported by either (a) an APPsRunTheWorld priority source plus another credible source, or (b) two independent credible non-ART sources. If a company only appears in weak/generic search results, downgrade to medium/low or omit it.

${exclusionRule}`;

    const userPrompt = isReplace
      ? `${baseContext}

${sourcingGuidance}

LIVE SOURCES:
${sourcesBlock}

Suggest exactly ONE NEW real specific END-CUSTOMER company this seller should target — matched to the seller's actual ICP from the profile above. It must be DIFFERENT from: ${excludeList.join(", ") || "(none)"}.
Include real name, website, uses_ifs guess (true if they already run something in the seller's category, false if greenfield, null if unknown), 2-5 current_systems they actually run that are relevant to the seller, a SPECIFIC problem tied to a recent public event written in the seller's category language, 3-6 designations, 2-4 real named ICP contacts with real /in/ LinkedIn URLs (omit if unsure), focus areas, and 1-3 real verifiable references (mix LinkedIn / PDF / web). Return empty 'similar', single-item 'targets'.`
      : `${baseContext}

${sourcingGuidance}

LIVE SOURCES:
${sourcesBlock}

Generate competitor analysis AND 5-8 real specific END-CUSTOMER target companies that match THIS seller's ICP (no vendors / consultancies / competitors in the seller's category). For each target: real name & website, uses_ifs (true if they already run something in the seller's category — i.e. rip-and-replace opportunity, false if greenfield, null if unknown), 2-5 current_systems they actually run relevant to the seller's offering, a SPECIFIC problem grounded in a recent public event (funding, hiring, M&A, expansion, regulation) written in the seller's category language, why-you-fit, 3-6 designations, 2-4 real named ICP contacts (full_name + role + real /in/ LinkedIn URL — omit if unverifiable), focus_areas, 1-3 real verifiable references. For similar/competitors: 3-5 real direct competitors of THIS seller's offering (whatever category that is) with strengths/weaknesses/your_advantage and 1-2 references each.`;

    const analystModel = isReplace ? "google/gemini-2.5-flash" : "openai/gpt-5-mini";

    await updateJob({ progress: 62, message: "Analyzing verified sources with AI" });
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: analystModel,
        messages: [
          { role: "system", content: `You are a B2B market analyst. The seller's category is: "${sellerCategoryDescriptor}" (derived from their profile — could be anything: ERP, cybersecurity, logistics SaaS, fintech APIs, marketing tools, legal tech, healthtech, etc. — do NOT assume a vertical). Prioritize AppsRunTheWorld/installed-base evidence, then cross-check with LinkedIn, PDFs, press releases, and market news. Pick real END-CUSTOMER companies that match the seller's actual ICP from their profile, and real direct competitors in the seller's category. Ground every pick in the live sources. Never fabricate URLs or names. Always include a mix of LinkedIn, PDF, and web reference links.` },
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

    if (response.status === 429) throw new HttpError("Rate limit. Try again.", 429);
    if (response.status === 402) throw new HttpError("AI credits exhausted.", 402);
    if (!response.ok) {
      const t = await response.text();
      console.error("AI error", response.status, t);
      throw new Error("AI gateway error");
    }

    await updateJob({ progress: 82, message: "Validating target quality" });
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
    // Seller-category tokens come from the seller's own profile, not a hardcoded vertical list.
    // We still keep a list of well-known enterprise vendors so that IF the seller mentions one,
    // we exclude that vendor from targets — but it does NOT bias non-enterprise sellers.
    const enterpriseVendors = ["ifs", "sap", "oracle", "microsoft dynamics", "dynamics", "infor", "epicor", "workday", "netsuite", "sage", "odoo", "salesforce", "servicenow", "siemens plm", "hubspot", "zoho"];
    const providerSignals = ["implementation partner", "implement", "implementation", "reseller", "system integrator", "systems integrator", "integrator", "consultancy", "consulting", "it services", "software development", "software vendor", "solution provider", "solutions provider", "managed service", "msp", "var", "partner", "digital transformation"];
    const serviceNameSuffixes = ["technologies", "technology", "solutions", "systems", "services", "consulting", "consultancy", "labs", "digital", "infotech", "softlabs", "soft", "informatics", "softech", "tech", "global services", "softwares", "software"];
    const sellerVendorSignals = enterpriseVendors.filter((vendor) => offeringText.includes(normalize(vendor)));
    // Seller-specific category keywords pulled from the profile itself (target_systems, product categories, product names)
    const sellerCategoryTokens = Array.from(new Set(
      [...sellerCategories, ...targetSystemsList, ...sellerProducts, sellerCategoryDescriptor]
        .flatMap((s) => normalize(s).split(" "))
        .filter((w) => w.length > 3)
    ));
    const sellerIsServicesFirm = providerSignals.some((s) => offeringText.includes(normalize(s)));
    const isCompetitor = (t: any): boolean => {
      const name = normalize(t.company ?? t.type);
      if (!name) return false;
      if (competitorNames.has(name)) return true;
      const sellerName = normalize(company.company_name);
      if (sellerName && (name.includes(sellerName) || sellerName.includes(name))) return true;

      const targetText = normalize([
        t.company, t.type, t.website, t.industry, t.problem, t.why,
        ...(t.current_systems ?? []), ...(t.focus_areas ?? []), ...(t.designations ?? []),
        ...((t.icp_contacts ?? []).flatMap((c: any) => [c?.role, c?.full_name])),
      ].filter(Boolean).join(" "));

      if (sellerVendorSignals.some((vendor) => name.includes(normalize(vendor)))) return true;
      // Only strip "Services / Solutions / Consulting" named firms when the SELLER isn't itself one
      if (!sellerIsServicesFirm) {
        const nameTokens = name.split(" ").filter(Boolean);
        const lastToken = nameTokens[nameTokens.length - 1] ?? "";
        if (serviceNameSuffixes.includes(lastToken)) return true;
      }
      const isProvider = providerSignals.some((signal) => targetText.includes(normalize(signal)));
      const mentionsSellerCategory = sellerVendorSignals.some((vendor) => targetText.includes(normalize(vendor)))
        || sellerCategoryTokens.some((tok) => tok && targetText.includes(tok));
      return !sellerIsServicesFirm && isProvider && mentionsSellerCategory;
    };
    if (Array.isArray(args.targets)) {
      args.targets = args.targets.filter((t: any) => !isCompetitor(t));
      // Quality gate: only keep ICP contacts with a real linkedin.com/in/ URL and a real-looking name.
      const validLinkedIn = /^https?:\/\/([a-z]{2,3}\.)?linkedin\.com\/in\/[A-Za-z0-9\-_%]+\/?/i;
      args.targets.forEach((t: any) => {
        t.icp_contacts = (t.icp_contacts ?? []).filter((c: any) =>
          c?.full_name && c.full_name.trim().split(/\s+/).length >= 2 &&
          c?.linkedin_url && validLinkedIn.test(c.linkedin_url)
        );
      });
    }

    await incrementAiEmails(admin, workspace_id);

    await supabase.from("activities").insert({
      workspace_id, user_id: user.id, type: "targets_generated",
      description: `AI generated ${args.targets?.length ?? 0} targets and ${args.similar?.length ?? 0} competitor profiles`,
    });

    await updateJob({
      status: "completed",
      progress: 100,
      message: "Targets ready",
      result: args,
      completed_at: new Date().toISOString(),
    });

    return args;
  } catch (e: any) {
    await updateJob({
      status: "failed",
      progress: 100,
      message: "Generation failed",
      error: e?.message ?? "Target generation failed",
      completed_at: new Date().toISOString(),
    });
    throw e;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body: GenerationBody = await req.json();
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new HttpError("Unauthorized", 401);

    if (body.async && body.mode !== "replace") {
      if (!body.workspace_id || typeof body.workspace_id !== "string") {
        throw new HttpError("Missing workspace_id", 400);
      }
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new HttpError("Unauthorized", 401);

      const { data: workspace } = await supabase
        .from("workspaces")
        .select("id")
        .eq("id", body.workspace_id)
        .maybeSingle();
      if (!workspace) throw new HttpError("Workspace not found", 403);

      const admin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data: job, error: jobError } = await admin
        .from("target_generation_jobs")
        .insert({
          workspace_id: body.workspace_id,
          user_id: user.id,
          mode: "generate",
          status: "pending",
          progress: 5,
          message: "Queued market research",
        })
        .select("id, status, progress, message")
        .single();
      if (jobError) throw jobError;

      const background = processTargetGeneration(body, authHeader, job.id).catch((e) => {
        console.error("generate-targets background failed", e);
      });
      (globalThis as any).EdgeRuntime?.waitUntil?.(background);

      return new Response(JSON.stringify({ job_id: job.id, status: job.status, progress: job.progress, message: job.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await processTargetGeneration(body, authHeader);
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error(e);
    const status = e instanceof HttpError ? e.status : 500;
    const payload = e instanceof HttpError ? e.payload : { error: e?.message ?? "Target generation failed" };
    return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
