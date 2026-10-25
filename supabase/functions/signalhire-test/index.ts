import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { signalHireProviderCredits } from '../_shared/signalhire-credits.ts';

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Require an authenticated caller — this endpoint exposes API config + credit balance.
    const authHeader = req.headers.get("Authorization") ?? "";
    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!url || !anonKey) throw new Error('Service configuration unavailable');
    const userClient = createClient(
      url,
      anonKey,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userRes } = await userClient.auth.getUser();
    if (!userRes?.user) {
      return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("SIGNALHIRE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ ok: false, error: "SIGNALHIRE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resp = await fetch("https://www.signalhire.com/api/v1/credits", {
      method: "GET",
      headers: { "apikey": apiKey, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(15000),
    });

    const text = await resp.text();
    let parsed: unknown = null;
    try { parsed = JSON.parse(text); } catch { /* Invalid balance response */ }

    if (!resp.ok) {
      return new Response(JSON.stringify({ ok: false, status: resp.status, error: `SignalHire balance request failed (${resp.status}). Check your configured API account.` }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const providerCredits = signalHireProviderCredits(parsed, resp.headers.get('X-Credits-Left'));
    if (providerCredits === null) throw new Error('SignalHire returned an unreadable credit balance');
    return new Response(JSON.stringify({ ok: true, providerCredits, credits: { credits: providerCredits } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "SignalHire credit balance unavailable. Please retry." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
