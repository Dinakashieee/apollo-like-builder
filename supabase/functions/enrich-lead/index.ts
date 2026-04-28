import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ApolloOrg = {
  name?: string;
  website_url?: string;
  industry?: string;
  estimated_num_employees?: number;
  annual_revenue_printed?: string;
  short_description?: string;
  technology_names?: string[];
  current_technologies?: { name: string; category?: string }[];
  keywords?: string[];
  founded_year?: number;
  city?: string;
  country?: string;
};

async function fetchApolloOrg(apiKey: string, companyName: string): Promise<ApolloOrg | null> {
  // Try domain inference from name first if it looks like a domain; otherwise pass as q_organization_name via search
  // Apollo's /organizations/enrich expects a `domain`. We'll use mixed_companies/search as a robust fallback.
  try {
    // 1) Try search by name to resolve the organization
    const searchRes = await fetch("https://api.apollo.io/api/v1/mixed_companies/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-Api-Key": apiKey,
      },
      body: JSON.stringify({
        q_organization_name: companyName,
        page: 1,
        per_page: 1,
      }),
    });
    if (!searchRes.ok) {
      console.warn("Apollo search failed", searchRes.status, await searchRes.text());
      return null;
    }
    const sjson = await searchRes.json();
    const org = sjson?.organizations?.[0] ?? sjson?.accounts?.[0];
    if (!org) return null;

    // 2) Enrich by domain for richer tech stack
    const domain = org.primary_domain || org.website_url?.replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!domain) return org as ApolloOrg;

    const enrichRes = await fetch(
      `https://api.apollo.io/api/v1/organizations/enrich?domain=${encodeURIComponent(domain)}`,
      { headers: { "Cache-Control": "no-cache", "X-Api-Key": apiKey } },
    );
    if (!enrichRes.ok) return org as ApolloOrg;
    const ejson = await enrichRes.json();
    return (ejson?.organization ?? org) as ApolloOrg;
  } catch (e) {
    console.error("Apollo error", e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { company_name, industry, role, contact_name } = await req.json();
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

    // 1) Look up the user's Apollo key (BYOK)
    const { data: keyRow } = await supabase
      .from("user_api_keys")
      .select("api_key")
      .eq("user_id", user.id)
      .eq("provider", "apollo")
      .maybeSingle();

    let apollo: ApolloOrg | null = null;
    let apolloUsed = false;
    if (keyRow?.api_key) {
      apollo = await fetchApolloOrg(keyRow.api_key, company_name);
      apolloUsed = !!apollo;
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const apolloContext = apollo
      ? `\n\nVERIFIED APOLLO.IO DATA (use as ground truth):
- Name: ${apollo.name ?? company_name}
- Industry: ${apollo.industry ?? "?"}
- Employees: ${apollo.estimated_num_employees ?? "?"}
- Revenue: ${apollo.annual_revenue_printed ?? "?"}
- Founded: ${apollo.founded_year ?? "?"}
- Location: ${[apollo.city, apollo.country].filter(Boolean).join(", ") || "?"}
- Description: ${apollo.short_description ?? "?"}
- Confirmed technologies in use: ${(apollo.technology_names ?? apollo.current_technologies?.map((t) => t.name) ?? []).slice(0, 40).join(", ") || "(none reported)"}
- Keywords: ${(apollo.keywords ?? []).slice(0, 20).join(", ")}`
      : "";

    const systemPrompt = `You are a B2B sales research analyst. Given a company name${apollo ? " and VERIFIED Apollo.io firmographic + tech-stack data" : ""}, infer:
- Systems / tools the company uses internally
- Operational or strategic pain points they likely face

${apollo
  ? "Apollo data is GROUND TRUTH for tech stack and firmographics — use those technologies verbatim and only ADD adjacent inferred tools. Pain points should be derived from company size, industry, and the actual tech stack."
  : "Use signals you would expect from public sources (job posts, engineering blogs, press releases, funding, leadership changes, layoffs, product launches)."}

Be specific. ${apollo ? "Confidence is 'high' when Apollo confirms tech." : "If the company is small/unknown, mark confidence 'low'."} Return concise items (1-4 words for systems, short phrases for pain points).`;

    const userPrompt = `Company: ${company_name}
${industry ? `Industry hint: ${industry}\n` : ""}${contact_name ? `Contact: ${contact_name}${role ? ` (${role})` : ""}\n` : ""}${apolloContext}

Infer their likely systems in use and pain points.`;

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
            description: "Return inferred systems and pain points for the company",
            parameters: {
              type: "object",
              properties: {
                systems_in_use: {
                  type: "array",
                  items: { type: "string" },
                  description: "5-12 likely systems/tools (Apollo-confirmed first, then inferred)",
                },
                pain_points: {
                  type: "array",
                  items: { type: "string" },
                  description: "4-8 short, concrete likely pain points",
                },
                signals: {
                  type: "array",
                  items: { type: "string" },
                  description: "2-5 short rationale signals",
                },
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

    return new Response(
      JSON.stringify({
        systems_in_use: args.systems_in_use ?? [],
        pain_points: args.pain_points ?? [],
        signals: args.signals ?? [],
        confidence: args.confidence ?? "low",
        apollo_used: apolloUsed,
        apollo_summary: apollo
          ? {
              industry: apollo.industry,
              employees: apollo.estimated_num_employees,
              revenue: apollo.annual_revenue_printed,
              location: [apollo.city, apollo.country].filter(Boolean).join(", "),
            }
          : null,
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
