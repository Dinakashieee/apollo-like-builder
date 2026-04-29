import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { workspace_id } = await req.json();
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: company } = await supabase
      .from("company_profiles").select("*").eq("workspace_id", workspace_id).maybeSingle();
    if (!company) throw new Error("Add a company profile first");

    const { data: products } = await supabase
      .from("products").select("name, description, category").eq("workspace_id", workspace_id);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const userPrompt = `Company: ${company.company_name}
Description: ${company.description ?? ""}
Industries: ${(company.industries ?? []).join(", ")}
Products: ${products?.map((p: any) => p.name + ": " + (p.description ?? "")).join(" | ") || company.products_summary || ""}

Generate competitor analysis AND a list of specific real companies this seller should target. For each target company, include:
- the real company name & website
- WHY they are a fit (concrete reason tied to the seller's product)
- DESIGNATIONS / job titles to pitch to (decision makers + influencers)
- FOCUS AREAS / departments or use-cases to pitch
- 1-3 REFERENCE LINKS (official site, recent news, careers page, press release, funding announcement) so the user can verify the reasoning. Use only real, well-known URLs you are confident exist (homepages, /about, /careers, Wikipedia, Crunchbase). Never invent URLs.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a B2B market analyst. Provide realistic competitive analysis AND name specific real-world target companies with verifiable reference links. Only use URLs you are highly confident exist (official homepages, Wikipedia, Crunchbase, well-known press). Never fabricate URLs or company names." },
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
                      problem: { type: "string", description: "Specific pain this company likely has" },
                      why: { type: "string", description: "Why this seller is a fit — concrete reason" },
                      designations: {
                        type: "array",
                        description: "3-6 job titles/designations to pitch (e.g. 'VP of Sales', 'Head of Revenue Operations')",
                        items: { type: "string" },
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
                    required: ["company", "website", "industry", "size", "problem", "why", "designations", "focus_areas", "references", "level"],
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

    await supabase.from("activities").insert({
      workspace_id, user_id: user.id, type: "targets_generated",
      description: `AI generated ${args.targets?.length ?? 0} targets and ${args.similar?.length ?? 0} competitor profiles`,
    });

    return new Response(JSON.stringify(args), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
