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
    const { workspace_id } = await req.json();
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

    const systemPrompt = `You are a B2B sales strategist. Generate 5-7 high-quality opportunity areas for this seller.
STRICT RULES:
- Every opportunity MUST be directly solvable by ONE of the seller's listed products/services below. Do NOT invent capabilities the seller does not have.
- The 'product_match' field MUST be the exact product/service name copied verbatim from the list.
- The 'rationale' field MUST start with "Solved by: <exact product name>" then explain how that specific product addresses the opportunity.
- Reject any idea that does not map to a listed product/service. Do not pad with generic opportunities.
- Industry and problem must be realistic for the seller's actual offering — not generic SaaS clichés.`;

    const userPrompt = `Company: ${company.company_name}
Description: ${company.description ?? "n/a"}
Target industries: ${(company.industries ?? []).join(", ") || "any"}

PRODUCTS / SERVICES THE USER OFFERS (this is the ONLY source of truth for capabilities — ignore anything else):
${productsList}

Additional products summary (context only): ${company.products_summary ?? "n/a"}

Generate 5-7 opportunities, each grounded in ONE of the products/services above.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "save_opportunities",
            description: "Save opportunity areas",
            parameters: {
              type: "object",
              properties: {
                opportunities: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      problem: { type: "string", description: "The problem this addresses" },
                      industry: { type: "string" },
                      score: { type: "number", description: "0-100" },
                      level: { type: "string", enum: ["high", "medium", "low"] },
                      product_match: { type: "string", description: "Exact product/service name from the seller's list" },
                      rationale: { type: "string", description: "Must start with 'Solved by: <product name>' then explain the fit" },
                    },
                    required: ["title", "problem", "industry", "score", "level", "product_match", "rationale"],
                  },
                },
              },
              required: ["opportunities"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "save_opportunities" } },
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

    // Replace existing
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

    await incrementAiEmails(admin, workspace_id);

    await supabase.from("activities").insert({
      workspace_id,
      user_id: user.id,
      type: "opportunity_generated",
      description: `Generated ${inserts.length} opportunities with AI`,
    });
    await supabase.from("notifications").insert({
      workspace_id,
      user_id: user.id,
      title: "AI opportunities ready",
      body: `${inserts.length} new opportunities for ${company.company_name}`,
      link: "/app/intelligence",
    });

    return new Response(JSON.stringify({ count: inserts.length, opportunities: inserts }), {
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
