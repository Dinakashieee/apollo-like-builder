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
    const { workspace_id, company_name, industry, role, contact_name } = await req.json();
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

    // Quota check + count this enrichment toward AI credits if a workspace was supplied.
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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const systemPrompt = `You are a B2B sales research analyst. Given a company name, infer:
- Systems / tools the company uses internally
- Operational or strategic pain points they likely face

Use signals you would expect from public sources (job posts, engineering blogs, press releases, funding, leadership changes, layoffs, product launches).

Be specific. If the company is small/unknown, mark confidence 'low'. Return concise items (1-4 words for systems, short phrases for pain points).`;

    const userPrompt = `Company: ${company_name}
${industry ? `Industry hint: ${industry}\n` : ""}${contact_name ? `Contact: ${contact_name}${role ? ` (${role})` : ""}\n` : ""}
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
                  description: "5-12 likely systems/tools the company uses",
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

    if (workspace_id) await incrementAiEmails(admin, workspace_id);


    return new Response(
      JSON.stringify({
        systems_in_use: args.systems_in_use ?? [],
        pain_points: args.pain_points ?? [],
        signals: args.signals ?? [],
        confidence: args.confidence ?? "low",
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
