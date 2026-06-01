import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { checkAiEmailQuota, incrementAiEmails } from "../_shared/entitlements.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ---------- Firecrawl helpers (best-effort; degrade gracefully) ----------

interface SearchHit {
  title: string;
  url: string;
  snippet: string;
}

async function fcSearch(query: string, limit = 5): Promise<SearchHit[]> {
  const key = Deno.env.get("FIRECRAWL_API_KEY");
  if (!key) return [];
  try {
    const r = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit }),
    });
    if (!r.ok) return [];
    const data = await r.json();
    const results = data?.data?.web ?? data?.data ?? data?.web ?? [];
    return (Array.isArray(results) ? results : [])
      .map((x: any) => ({
        title: (x.title ?? "").toString().slice(0, 200),
        url: (x.url ?? x.link ?? "").toString(),
        snippet: (x.description ?? x.snippet ?? "").toString().slice(0, 300),
      }))
      .filter((h: SearchHit) => h.url);
  } catch {
    return [];
  }
}

async function fcScrape(url: string): Promise<{ markdown: string; title?: string } | null> {
  const key = Deno.env.get("FIRECRAWL_API_KEY");
  if (!key) return null;
  try {
    const r = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
    });
    if (!r.ok) return null;
    const data = await r.json();
    const md = (data?.data?.markdown ?? data?.markdown ?? "").toString();
    const title = (data?.data?.metadata?.title ?? data?.metadata?.title ?? "").toString();
    if (!md) return null;
    return { markdown: md.slice(0, 6000), title };
  } catch {
    return null;
  }
}

function normalizeWebsite(input?: string): string | null {
  if (!input) return null;
  const s = input.trim();
  if (!s) return null;
  try {
    const u = new URL(s.startsWith("http") ? s : `https://${s}`);
    return u.origin;
  } catch {
    return null;
  }
}

async function discoverWebsite(company: string): Promise<string | null> {
  const hits = await fcSearch(`${company} official site`, 3);
  for (const h of hits) {
    const lower = h.url.toLowerCase();
    if (lower.includes("linkedin.com") || lower.includes("wikipedia.org") || lower.includes("crunchbase.com")) continue;
    const origin = normalizeWebsite(h.url);
    if (origin) return origin;
  }
  return null;
}

// ---------------------------------------------------------------

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { workspace_id, company_name, industry, role, contact_name, website } = await req.json();
    if (!company_name || typeof company_name !== "string") {
      return new Response(JSON.stringify({ error: "company_name required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
    if (workspace_id) {
      const { data: membership } = await admin
        .from("workspace_members").select("user_id")
        .eq("workspace_id", workspace_id).eq("user_id", user.id).maybeSingle();
      if (!membership) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const quota = await checkAiEmailQuota(admin, workspace_id);
      if (quota) {
        return new Response(JSON.stringify({ error: quota.reason, code: "quota_exceeded", ...quota }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Pull seller context so the inference is tailored to THIS seller's category.
    let sellerContext = "";
    if (workspace_id) {
      const [{ data: company }, { data: products }] = await Promise.all([
        admin.from("company_profiles").select("company_name, description, industries, target_systems, products_summary")
          .eq("workspace_id", workspace_id).maybeSingle(),
        admin.from("products").select("name, description, category").eq("workspace_id", workspace_id),
      ]);
      if (company) {
        const offering = [
          ...(products?.map((p: any) => p.name) ?? []),
          ...((company as any).target_systems ?? []),
        ].filter(Boolean).join(", ");
        sellerContext = `Seller (the one doing outreach): ${company.company_name}
Seller industries: ${(company.industries ?? []).join(", ") || "(unspecified)"}
Seller offers / implements: ${offering || (company as any).products_summary || "(unspecified)"}
Seller description: ${(company as any).description ?? ""}`;
      }
    }

    // ---------- Live crawl phase ----------
    const targetWebsite = normalizeWebsite(website) ?? await discoverWebsite(company_name);
    const [home, news] = await Promise.all([
      targetWebsite ? fcScrape(targetWebsite) : Promise.resolve(null),
      fcSearch(`${company_name} news ${new Date().getFullYear()}`, 5),
    ]);

    const evidenceBlock = [
      targetWebsite ? `WEBSITE: ${targetWebsite}` : "WEBSITE: (not found)",
      home ? `\nHOMEPAGE EXCERPT (${home.title ?? ""}):\n${home.markdown}` : "",
      news.length
        ? `\nRECENT NEWS / MENTIONS:\n${news.map((n, i) => `[${i + 1}] ${n.title}\n  ${n.url}\n  ${n.snippet}`).join("\n")}`
        : "",
    ].filter(Boolean).join("\n");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const systemPrompt = `You are a B2B sales research analyst. You receive a target company plus LIVE EVIDENCE (their website excerpt + recent news). Ground every claim in that evidence when possible; only fall back to general inference when evidence is missing. Tailor systems_in_use and pain_points to what would matter to THE SELLER described below — pain points should be opportunities the seller can act on, not generic problems. Never invent URLs or named people; if you cannot verify a name from the evidence, omit it.`;

    const userPrompt = `${sellerContext ? sellerContext + "\n\n" : ""}TARGET COMPANY: ${company_name}
${industry ? `Industry hint: ${industry}\n` : ""}${contact_name ? `Known contact: ${contact_name}${role ? ` (${role})` : ""}\n` : ""}

LIVE EVIDENCE:
${evidenceBlock || "(no live evidence available — degrade to inference, mark confidence 'low')"}

Return the structured enrichment.`;

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
            name: "save_enrichment",
            description: "Return inferred systems, pain points and company facts grounded in evidence",
            parameters: {
              type: "object",
              properties: {
                industry_guess: { type: "string", description: "Best guess of industry / vertical" },
                size_guess: { type: "string", description: "Headcount or revenue band (e.g. '50-200', 'enterprise', 'SMB')" },
                tech_stack: { type: "array", items: { type: "string" }, description: "Known/likely tools detectable from evidence" },
                systems_in_use: { type: "array", items: { type: "string" }, description: "5-12 likely systems/tools the company uses, biased to ones relevant to the SELLER's category" },
                pain_points: { type: "array", items: { type: "string" }, description: "4-8 short, concrete pain points the SELLER can act on" },
                recent_news: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: { title: { type: "string" }, url: { type: "string" } },
                    required: ["title", "url"],
                  },
                  description: "0-5 real news items pulled from the evidence (verbatim URLs only)",
                },
                decision_makers: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      full_name: { type: "string" },
                      role: { type: "string" },
                      linkedin_url: { type: "string" },
                    },
                    required: ["full_name", "role"],
                  },
                  description: "0-4 named decision makers ONLY if visible in evidence; otherwise empty",
                },
                signals: { type: "array", items: { type: "string" }, description: "2-5 short rationale signals tied to evidence" },
                confidence: { type: "string", enum: ["high", "medium", "low"] },
              },
              required: ["systems_in_use", "pain_points", "signals", "confidence"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "save_enrichment" } },
      }),
    });

    if (aiResp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit hit. Try again in a minute." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiResp.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Workspace settings." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI error:", aiResp.status, t);
      throw new Error("AI gateway error");
    }

    const json = await aiResp.json();
    const args = JSON.parse(json.choices[0].message.tool_calls[0].function.arguments);

    if (workspace_id) await incrementAiEmails(admin, workspace_id);

    return new Response(
      JSON.stringify({
        website: targetWebsite,
        industry_guess: args.industry_guess ?? null,
        size_guess: args.size_guess ?? null,
        tech_stack: args.tech_stack ?? [],
        systems_in_use: args.systems_in_use ?? [],
        pain_points: args.pain_points ?? [],
        recent_news: args.recent_news ?? [],
        decision_makers: args.decision_makers ?? [],
        signals: args.signals ?? [],
        confidence: args.confidence ?? "low",
        evidence_used: { homepage: !!home, news_count: news.length },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e?.message ?? "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
