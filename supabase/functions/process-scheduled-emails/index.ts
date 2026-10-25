// Cron-driven dispatcher for scheduled email replies.
// Sends due rows from public.scheduled_emails using the built-in transactional sender,
// or marks them sent if they were prepared for the user's connected mailbox (handled client-side).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { isUserSendingPaused } from "../_shared/email-sending-break.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    // Restrict to service-role callers (cron only). Reject public callers.
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!token || token !== serviceKey) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, serviceKey);
    const { data: due } = await admin
      .from("scheduled_emails")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString())
      .limit(20);
    const results: any[] = [];
    for (const row of due ?? []) {
      // Leave paused emails pending; never mark them failed or sent.
      try {
        if (await isUserSendingPaused(admin, row.user_id)) {
          results.push({ id: row.id, deferred: true });
          continue;
        }
      } catch {
        results.push({ id: row.id, deferred: true });
        continue;
      }
      try {
        if (row.send_via === "builtin") {
          const r = await admin.functions.invoke("send-transactional-email", {
            body: {
              templateName: "lead-added",
              recipientEmail: row.to_email,
              idempotencyKey: `scheduled-${row.id}`,
              templateData: { subject: row.subject, body: row.body },
              sender_user_id: row.user_id,
              workspace_id: row.workspace_id,
            },
          });
          if (r.error) {
            if (r.error.context?.status === 409 || r.error.context?.status === 503) {
              results.push({ id: row.id, deferred: true });
              continue;
            }
            throw new Error(r.error.message);
          }
        }
        // For 'connected' / 'mailto' the client handles sending; cron just marks attempted.
        await admin.from("scheduled_emails")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", row.id);
        results.push({ id: row.id, ok: true });
      } catch (e) {
        await admin.from("scheduled_emails")
          .update({ status: "failed", error: e instanceof Error ? e.message : "unknown" })
          .eq("id", row.id);
        results.push({ id: row.id, ok: false });
      }
    }
    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
