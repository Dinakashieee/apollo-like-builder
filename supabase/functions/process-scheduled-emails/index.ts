// Cron-driven dispatcher for scheduled email replies.
// Sends due rows from public.scheduled_emails using the built-in transactional sender,
// or marks them sent if they were prepared for the user's connected mailbox (handled client-side).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { processScheduledBatch } from '../_shared/scheduled-email-batch.ts';

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    // Restrict to service-role callers (cron only). Reject public callers.
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!token || token !== serviceKey) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const url = Deno.env.get("SUPABASE_URL");
    if (!url || !serviceKey) throw new Error('Scheduled emails are unavailable');
    const admin = createClient(url, serviceKey);
    const result = await processScheduledBatch(admin);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
