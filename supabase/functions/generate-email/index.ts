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
    const { workspace_id, lead_id, tone } = await req.json();
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Quota check (Free tier = 20 AI emails / month). Uses service role.
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const quota = await checkAiEmailQuota(admin, workspace_id);
    if (quota) {
      return new Response(
        JSON.stringify({ error: quota.reason, code: "quota_exceeded", ...quota }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const [{ data: company }, { data: lead }, { data: products }] = await Promise.all([
      supabase.from("company_profiles").select("*").eq("workspace_id", workspace_id).maybeSingle(),
      supabase.from("leads").select("*").eq("id", lead_id).maybeSingle(),
      supabase.from("products").select("name, description").eq("workspace_id", workspace_id),
    ]);
    if (!lead) throw new Error("Lead not found");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const userPrompt = `Write a personalized cold outreach email.

SENDER (${company?.company_name ?? "our company"}):
- ${company?.description ?? ""}
- Products: ${products?.map((p: any) => p.name).join(", ") || company?.products_summary || ""}
- Industries: ${(company?.industries ?? []).join(", ")}

RECIPIENT:
- Name: ${lead.contact_name ?? "(unknown)"}
- Role: ${lead.role ?? "(unknown)"}
- Company: ${lead.company_name}
- Notes: ${lead.notes ?? ""}

TONE: ${tone ?? "professional"}

Constraints: Under 110 words. Specific. Not salesy. End with one clear ask.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You write concise, high-converting B2B outreach emails." },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "draft_email",
            parameters: {
              type: "object",
              properties: {
                subject: { type: "string" },
                body: { type: "string" },
              },
              required: ["subject", "body"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "draft_email" } },
      }),
    });

    if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!response.ok) throw new Error("AI error");

    const json = await response.json();
    const args = JSON.parse(json.choices[0].message.tool_calls[0].function.arguments);

    return new Response(JSON.stringify(args), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
