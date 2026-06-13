import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PERSONAL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "outlook.com", "hotmail.com",
  "live.com", "icloud.com", "me.com", "aol.com", "proton.me", "protonmail.com",
]);

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json(401, { error: "unauthorized" });

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const { data: claims } = await userClient.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return json(401, { error: "unauthorized" });

  let body: any;
  try { body = await req.json(); } catch { return json(400, { error: "invalid_json" }); }

  const action = body?.action;
  const workspaceId = body?.workspace_id;
  if (!workspaceId || typeof workspaceId !== "string") return json(400, { error: "missing_workspace_id" });

  const admin = createClient(url, service);

  // Confirm caller is the workspace owner
  const { data: ws } = await admin
    .from("workspaces")
    .select("id, owner_id, name")
    .eq("id", workspaceId)
    .maybeSingle();
  if (!ws || ws.owner_id !== userId) return json(403, { error: "not_workspace_owner" });

  if (action === "request") {
    const fromEmail = String(body?.from_email ?? "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(fromEmail) || fromEmail.length > 160) {
      return json(400, { error: "invalid_email" });
    }
    const domain = fromEmail.split("@")[1];
    if (PERSONAL_DOMAINS.has(domain)) return json(400, { error: "personal_domain_not_allowed" });

    // rate-limit: max once per 30s
    const { data: existing } = await admin
      .from("email_sender_settings")
      .select("last_verification_sent_at")
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (existing?.last_verification_sent_at) {
      const last = new Date(existing.last_verification_sent_at).getTime();
      if (Date.now() - last < 30_000) return json(429, { error: "rate_limited" });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const { error: upErr } = await admin
      .from("email_sender_settings")
      .upsert({
        workspace_id: workspaceId,
        mode: "custom",
        from_email: fromEmail,
        verified: false,
        verification_code: code,
        last_verification_sent_at: new Date().toISOString(),
      }, { onConflict: "workspace_id" });
    if (upErr) return json(500, { error: "save_failed", detail: upErr.message });

    const { error: sendErr } = await admin.functions.invoke("send-transactional-email", {
      body: {
        templateName: "sender-verify",
        recipientEmail: fromEmail,
        idempotencyKey: `sender-verify-${workspaceId}-${code}`,
        templateData: { code, fromAddress: fromEmail, workspaceName: ws.name },
      },
    });
    if (sendErr) return json(500, { error: "send_failed", detail: sendErr.message });
    return json(200, { ok: true });
  }

  if (action === "confirm") {
    const code = String(body?.code ?? "").trim();
    if (!/^\d{6}$/.test(code)) return json(400, { error: "invalid_code_format" });

    const { data: row } = await admin
      .from("email_sender_settings")
      .select("verification_code, from_email")
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (!row?.verification_code) return json(400, { error: "no_code_on_file" });
    if (row.verification_code !== code) return json(400, { error: "code_mismatch" });

    const { error: updErr } = await admin
      .from("email_sender_settings")
      .update({ verified: true, verification_code: null })
      .eq("workspace_id", workspaceId);
    if (updErr) return json(500, { error: "update_failed", detail: updErr.message });
    return json(200, { ok: true, verified: true });
  }

  return json(400, { error: "unknown_action" });
});
