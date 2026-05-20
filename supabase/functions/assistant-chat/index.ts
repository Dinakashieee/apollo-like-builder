// In-app AI assistant. Auth required. Has read access to the user's company profile, leads, and products.
// Counts toward Free tier AI email quota (20/mo).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { checkAiEmailQuota, incrementAiEmails } from "../_shared/entitlements.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { messages, workspace_id } = await req.json();
    if (!Array.isArray(messages) || !workspace_id) {
      return new Response(JSON.stringify({ error: "messages and workspace_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify caller is a member of the requested workspace before doing
    // any quota work or AI calls (prevents cross-workspace quota exhaustion).
    const { data: membership } = await admin
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Quota check (Free = 20 AI calls / month, shared with Composer).
    const quota = await checkAiEmailQuota(admin, workspace_id);
    if (quota) {
      return new Response(
        JSON.stringify({ error: quota.reason, code: "quota_exceeded", ...quota }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Pull workspace context (cap row counts to keep prompt small).
    const [{ data: company }, { data: leads }, { data: products }] = await Promise.all([
      userClient.from("company_profiles").select("company_name, description, industries, products_summary").eq("workspace_id", workspace_id).maybeSingle(),
      userClient.from("leads").select("company_name, contact_name, role, status, score, industry").eq("workspace_id", workspace_id).order("score", { ascending: false }).limit(25),
      userClient.from("products").select("name, description").eq("workspace_id", workspace_id).limit(10),
    ]);

    const context = `WORKSPACE CONTEXT:
Company: ${company?.company_name ?? "(not set)"} — ${company?.description ?? ""}
Industries: ${(company?.industries ?? []).join(", ") || "(none)"}
Products: ${products?.map((p: any) => `${p.name}: ${p.description ?? ""}`).join("; ") || company?.products_summary || "(none)"}

TOP LEADS (${leads?.length ?? 0} shown):
${leads?.map((l: any) => `- ${l.company_name} | ${l.contact_name ?? "?"} (${l.role ?? "?"}) | status=${l.status} | score=${l.score ?? 0}`).join("\n") || "(no leads yet)"}`;

    const systemPrompt = `You are EngageIQ's in-app sales assistant. You help the user prioritize leads, draft outreach ideas, and reason about their pipeline. Use the workspace context below. If the user asks for something not supported by the data, say so. Be concise, action-oriented, and use markdown. Never make up lead names, scores, or numbers.

${context}`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, ...messages.slice(-12)],
        stream: true,
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit, try again shortly." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!response.ok) {
      const t = await response.text();
      console.error("AI error", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Count this conversation turn toward Free quota.
    await incrementAiEmails(admin, workspace_id);

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e: any) {
    console.error("assistant-chat error", e);
    return new Response(JSON.stringify({ error: e?.message ?? "error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
