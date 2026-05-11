// Public support chatbot for the landing page. No auth.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are EngageIQ's support assistant. You help prospective customers understand the product and pricing.

About EngageIQ:
- AI-powered B2B sales engagement: lead intelligence, smart email composer, multi-step automation, pipeline analytics.
- Plans (USD, monthly or 20% off annual):
  - Free: up to 50 leads, 25 AI emails/month, basic scoring, 1 user, community support.
  - Starter ($19/mo or $182.40/yr): up to 1,000 leads, full AI intelligence, 3 users, unlimited composer, 2,500 AI emails/mo.
  - Pro ($149/mo or $1,430/yr): unlimited leads & AI emails, advanced intent+fit scoring, 10 users, unlimited automations.
  - Enterprise: custom pricing, audit logs, dedicated success manager.
- Plan prices exclude payment processing (5% + 50¢ per transaction).
- Plan changes are prorated immediately. Cancellations take effect at the end of the billing period.

Tone: concise, friendly, no fluff. If you don't know something, say so and suggest contacting support. Never invent features. Never claim integrations not listed. Encourage users to start with the Free plan or book a demo.`;

// Per-IP token bucket: 20 requests per 10 minutes per IP. In-memory is fine
// here because abuse traffic from a single IP would hit the same warm
// instance; this is a coarse first line of defense, not a hard guarantee.
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 20;
const ipHits: Map<string, number[]> = new Map();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (ipHits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  arr.push(now);
  ipHits.set(ip, arr);
  return arr.length > RATE_MAX;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim()
      || req.headers.get("cf-connecting-ip")
      || "unknown";
    if (rateLimited(ip)) {
      return new Response(JSON.stringify({ error: "Too many requests. Please slow down." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 30) {
      return new Response(JSON.stringify({ error: "messages array required (max 30)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Cap individual message size to prevent prompt-stuffing abuse.
    for (const m of messages) {
      if (typeof m?.content === "string" && m.content.length > 4000) {
        return new Response(JSON.stringify({ error: "Message too long." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages.slice(-12)],
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

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
