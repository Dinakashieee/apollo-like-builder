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
    const { workspace_id, mode } = await req.json();
    if (!workspace_id) throw new Error("workspace_id required");

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
      .from("company_profiles")
      .select("*")
      .eq("workspace_id", workspace_id)
      .maybeSingle();
    if (!company) throw new Error("Add a company profile first");

    const { data: products } = await supabase
      .from("products")
      .select("name, description, category")
      .eq("workspace_id", workspace_id);

    if (!products || products.length === 0) {
      return new Response(JSON.stringify({ error: "Add at least one product or service under Company first — opportunities must be grounded in what you actually sell." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const productsList = products
      .map((p: any, i: number) => `${i + 1}. ${p.name}${p.category ? ` [${p.category}]` : ""}: ${p.description ?? "(no description)"}`)
      .join("\n");

    const today = new Date();
    const quarter = `Q${Math.floor(today.getMonth() / 3) + 1} ${today.getFullYear()}`;

    const systemPrompt = `You are a senior B2B market strategist and sales advisor. The seller below has uploaded their company profile and product catalog. Produce a SHARP, SPECIFIC market brief — never generic SaaS clichés.

Return four sections:

1. market_pain_points (5-8): Concrete pain points buyers in the seller's target industries are dealing with RIGHT NOW (${quarter}). Each item: { pain_point, who_feels_it (specific role/department), severity ("critical"|"high"|"medium"), evidence (one-sentence why this hurts) }.

2. focus_recommendations (4-6): Where the seller should focus their GTM energy this quarter. Each item: { focus, why, expected_impact ("high"|"medium"|"low"), product_to_lead_with (EXACT name from product list) }.

3. market_trends (4-6): Macro + industry trends shaping demand in the next 3-6 months for the seller's space. Each item: { trend, direction ("rising"|"shifting"|"declining"), implication_for_seller, time_horizon (e.g. "next 3 months", "by EOY ${today.getFullYear()}") }. Treat the current quarter as ${quarter}.

4. opportunities (5-7): Specific deal opportunities. Each item: { title, problem, industry, score (0-100), level ("high"|"medium"|"low"), product_match (EXACT name from list), rationale (start with "Solved by: <exact product name>") }.

STRICT RULES:
- Every product_match / product_to_lead_with MUST be copied verbatim from the product list.
- Do NOT invent capabilities the seller doesn't have.
- Pain points and trends must be tied to the seller's industries and product space — not generic "AI is hot" filler.
- Be concrete: name actual buyer roles, regulations, vendor categories.`;

    const userPrompt = `CURRENT QUARTER: ${quarter} (today is ${today.toISOString().slice(0, 10)})

SELLER COMPANY:
Name: ${company.company_name}
Description: ${company.description ?? "n/a"}
Positioning: ${(company as any).positioning ?? "n/a"}
Target industries: ${(company.industries ?? []).join(", ") || "any"}
Pain points they solve: ${((company as any).solved_pain_points ?? []).join(", ") || "n/a"}
Target systems they integrate with: ${((company as any).target_systems ?? []).join(", ") || "n/a"}

PRODUCTS / SERVICES (sole source of truth for capabilities):
${productsList}

Additional summary: ${company.products_summary ?? "n/a"}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            name: "save_market_brief",
            description: "Save the full market intelligence brief.",
            parameters: {
              type: "object",
              properties: {
                market_pain_points: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      pain_point: { type: "string" },
                      who_feels_it: { type: "string" },
                      severity: { type: "string", enum: ["critical", "high", "medium"] },
                      evidence: { type: "string" },
                    },
                    required: ["pain_point", "who_feels_it", "severity", "evidence"],
                  },
                },
                focus_recommendations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      focus: { type: "string" },
                      why: { type: "string" },
                      expected_impact: { type: "string", enum: ["high", "medium", "low"] },
                      product_to_lead_with: { type: "string" },
                    },
                    required: ["focus", "why", "expected_impact", "product_to_lead_with"],
                  },
                },
                market_trends: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      trend: { type: "string" },
                      direction: { type: "string", enum: ["rising", "shifting", "declining"] },
                      implication_for_seller: { type: "string" },
                      time_horizon: { type: "string" },
                    },
                    required: ["trend", "direction", "implication_for_seller", "time_horizon"],
                  },
                },
                opportunities: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      problem: { type: "string" },
                      industry: { type: "string" },
                      score: { type: "number" },
                      level: { type: "string", enum: ["high", "medium", "low"] },
                      product_match: { type: "string" },
                      rationale: { type: "string" },
                    },
                    required: ["title", "problem", "industry", "score", "level", "product_match", "rationale"],
                  },
                },
              },
              required: ["market_pain_points", "focus_recommendations", "market_trends", "opportunities"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "save_market_brief" } },
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit hit. Try again in a minute." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Workspace settings." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!response.ok) {
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const json = await response.json();
    const args = JSON.parse(json.choices[0].message.tool_calls[0].function.arguments);
    const ops = args.opportunities ?? [];

    // Replace existing opportunities
    await supabase.from("opportunities").delete().eq("workspace_id", workspace_id);
    const inserts = ops.map((o: any) => ({
      workspace_id,
      title: o.title,
      problem: o.problem,
      industry: o.industry,
      score: Math.round(o.score),
      level: o.level,
      rationale: o.rationale,
    }));
    if (inserts.length > 0) {
      await supabase.from("opportunities").insert(inserts);
    }

    // Upsert market intelligence (trends refreshed each generation)
    await admin.from("market_intelligence").upsert({
      workspace_id,
      market_pain_points: args.market_pain_points ?? [],
      focus_recommendations: args.focus_recommendations ?? [],
      market_trends: args.market_trends ?? [],
      trends_refreshed_at: new Date().toISOString(),
      refreshed_at: new Date().toISOString(),
    }, { onConflict: "workspace_id" });

    await incrementAiEmails(admin, workspace_id);

    await supabase.from("activities").insert({
      workspace_id,
      user_id: user.id,
      type: "opportunity_generated",
      description: `Generated market brief + ${inserts.length} opportunities (auto-refresh: ${mode === "auto" ? "yes" : "manual"})`,
    });
    await supabase.from("notifications").insert({
      workspace_id,
      user_id: user.id,
      title: "AI market brief ready",
      body: `Pain points, focus areas, trends and ${inserts.length} opportunities updated for ${company.company_name}`,
      link: "/app/intelligence",
    });

    return new Response(JSON.stringify({
      count: inserts.length,
      opportunities: inserts,
      market_pain_points: args.market_pain_points ?? [],
      focus_recommendations: args.focus_recommendations ?? [],
      market_trends: args.market_trends ?? [],
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e?.message ?? "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
