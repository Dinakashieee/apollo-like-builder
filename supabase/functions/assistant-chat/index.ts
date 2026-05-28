// In-app AI assistant. Auth required. Has read access to the user's company profile, leads, and products.
// Can also update lead status via a tool call (writes via the user's RLS-scoped client).
// Counts toward Free tier AI email quota (20/mo).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { checkAiEmailQuota, incrementAiEmails } from "../_shared/entitlements.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LEAD_STATUSES = ["new", "contacted", "qualified", "won", "lost"] as const;
type LeadStatus = typeof LEAD_STATUSES[number];

const tools = [
  {
    type: "function",
    function: {
      name: "update_lead_status",
      description:
        "Update the status of a lead in the user's workspace. Match the lead by company name and optionally contact name. Use this when the user asks to mark a lead as contacted, qualified, won, lost, or back to new.",
      parameters: {
        type: "object",
        properties: {
          company_name: { type: "string", description: "Company name of the lead (case-insensitive contains match)." },
          contact_name: { type: "string", description: "Optional contact name to disambiguate when several leads share a company." },
          status: { type: "string", enum: LEAD_STATUSES as unknown as string[] },
        },
        required: ["company_name", "status"],
      },
    },
  },
];

// Wrap a text string as an OpenAI-style SSE stream so the existing client parser works.
function textToSse(text: string): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      const chunk = { choices: [{ delta: { content: text } }] };
      controller.enqueue(enc.encode(`data: ${JSON.stringify(chunk)}\n\n`));
      controller.enqueue(enc.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
}

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

    const quota = await checkAiEmailQuota(admin, workspace_id);
    if (quota) {
      return new Response(
        JSON.stringify({ error: quota.reason, code: "quota_exceeded", ...quota }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const [{ data: company }, { data: leads }, { data: products }] = await Promise.all([
      userClient.from("company_profiles").select("company_name, description, industries, products_summary").eq("workspace_id", workspace_id).maybeSingle(),
      userClient.from("leads").select("id, company_name, contact_name, role, status, score, industry").eq("workspace_id", workspace_id).order("score", { ascending: false }).limit(25),
      userClient.from("products").select("name, description").eq("workspace_id", workspace_id).limit(10),
    ]);

    const context = `WORKSPACE CONTEXT:
Company: ${company?.company_name ?? "(not set)"} — ${company?.description ?? ""}
Industries: ${(company?.industries ?? []).join(", ") || "(none)"}
Products: ${products?.map((p: any) => `${p.name}: ${p.description ?? ""}`).join("; ") || company?.products_summary || "(none)"}

TOP LEADS (${leads?.length ?? 0} shown):
${leads?.map((l: any) => `- ${l.company_name} | ${l.contact_name ?? "?"} (${l.role ?? "?"}) | status=${l.status} | score=${l.score ?? 0}`).join("\n") || "(no leads yet)"}`;

    const systemPrompt = `You are EngageIQ's in-app sales assistant. You help the user prioritize leads, draft outreach ideas, and reason about their pipeline. Use the workspace context below. If the user asks to change a lead's status (e.g. "mark Acme as contacted", "move Globex to won", "set lead X to qualified"), call the update_lead_status tool. Valid statuses: ${LEAD_STATUSES.join(", ")}. Never invent lead names — only act on leads visible in the context. After a successful tool call, confirm what changed in one short sentence. Be concise, action-oriented, and use markdown.

${context}`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const baseMessages = [{ role: "system", content: systemPrompt }, ...messages.slice(-12)];

    // First pass: non-streaming so we can detect tool calls.
    const first = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: baseMessages,
        tools,
      }),
    });

    if (first.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit, try again shortly." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (first.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!first.ok) {
      const t = await first.text();
      console.error("AI error", first.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const firstJson = await first.json();
    const choice = firstJson?.choices?.[0]?.message;
    const toolCalls = choice?.tool_calls ?? [];

    await incrementAiEmails(admin, workspace_id);

    // No tool calls — stream back the assistant text.
    if (!toolCalls.length) {
      const text = (choice?.content ?? "").trim() || "Sorry, I couldn't generate a response.";
      return new Response(textToSse(text), {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Execute each tool call.
    const toolResults: { tool_call_id: string; name: string; content: string }[] = [];
    for (const call of toolCalls) {
      const name = call?.function?.name;
      let argStr = call?.function?.arguments ?? "{}";
      let args: any = {};
      try { args = typeof argStr === "string" ? JSON.parse(argStr) : argStr; } catch { args = {}; }

      if (name === "update_lead_status") {
        const status: LeadStatus | undefined = LEAD_STATUSES.includes(args?.status)
          ? args.status
          : undefined;
        const companyQ = (args?.company_name ?? "").toString().trim();
        const contactQ = (args?.contact_name ?? "").toString().trim();

        let result = "";
        if (!status || !companyQ) {
          result = "Missing required fields (company_name and a valid status).";
        } else {
          let q = userClient
            .from("leads")
            .select("id, company_name, contact_name, status")
            .eq("workspace_id", workspace_id)
            .ilike("company_name", `%${companyQ}%`);
          if (contactQ) q = q.ilike("contact_name", `%${contactQ}%`);
          const { data: matches, error: findErr } = await q.limit(5);
          if (findErr) {
            result = `Lookup failed: ${findErr.message}`;
          } else if (!matches?.length) {
            result = `No lead matched "${companyQ}"${contactQ ? ` / "${contactQ}"` : ""}.`;
          } else if (matches.length > 1) {
            result = `Multiple leads matched: ${matches.map((m) => `${m.company_name}${m.contact_name ? ` (${m.contact_name})` : ""}`).join("; ")}. Ask the user which one.`;
          } else {
            const lead = matches[0];
            const { error: upErr } = await userClient
              .from("leads")
              .update({ status, updated_at: new Date().toISOString() })
              .eq("id", lead.id);
            if (upErr) {
              result = `Update failed: ${upErr.message}`;
            } else {
              await userClient.from("activities").insert({
                workspace_id, user_id: user.id, type: "lead_status_changed",
                description: `Status changed via assistant: ${lead.company_name} → ${status} (was ${lead.status})`,
              });
              result = `Updated ${lead.company_name}${lead.contact_name ? ` (${lead.contact_name})` : ""} from ${lead.status} → ${status}.`;
            }
          }
        }
        toolResults.push({ tool_call_id: call.id, name, content: result });
      } else {
        toolResults.push({ tool_call_id: call.id, name: name ?? "unknown", content: "Unknown tool." });
      }
    }

    // Second pass: stream the final natural-language response back to the user.
    const second = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        stream: true,
        messages: [
          ...baseMessages,
          { role: "assistant", content: choice?.content ?? "", tool_calls: toolCalls },
          ...toolResults.map((r) => ({
            role: "tool",
            tool_call_id: r.tool_call_id,
            name: r.name,
            content: r.content,
          })),
        ],
      }),
    });

    if (!second.ok || !second.body) {
      const fallback = toolResults.map((r) => r.content).join("\n");
      return new Response(textToSse(fallback || "Done."), {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    return new Response(second.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e: any) {
    console.error("assistant-chat error", e);
    return new Response(JSON.stringify({ error: e?.message ?? "error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
