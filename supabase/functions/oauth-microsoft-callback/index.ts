import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const ALLOWED_REDIRECT_ORIGINS = [
  "https://engageiqlk.com",
  "https://www.engageiqlk.com",
  "https://engageiqlk.lovable.app",
  "https://id-preview--aa623c5c-385f-4ba7-b839-ca1cfa59f854.lovable.app",
  "http://localhost:5173",
  "http://localhost:8080",
];

function safeRedirect(redirectTo?: string | null): string | undefined {
  if (!redirectTo) return undefined;
  try {
    const u = new URL(redirectTo);
    const origin = `${u.protocol}//${u.host}`;
    if (ALLOWED_REDIRECT_ORIGINS.includes(origin)) return origin;
  } catch { /* ignore */ }
  return undefined;
}

function htmlResponse(title: string, body: string, redirectTo?: string) {
  const safeTitle = escapeHtml(title);
  const safeBody = escapeHtml(body);
  const safe = safeRedirect(redirectTo);
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><title>${safeTitle}</title>
    ${safe ? `<meta http-equiv="refresh" content="2;url=${escapeHtml(safe)}/settings?inbox=connected">` : ""}
    <style>body{font-family:system-ui;background:#0F172A;color:#F8FAFC;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
    .card{max-width:480px;padding:32px;background:#1E293B;border-radius:12px;text-align:center}
    h1{margin:0 0 12px;font-size:20px}p{color:#94A3B8;line-height:1.5}a{color:#60A5FA}</style></head>
    <body><div class="card"><h1>${safeTitle}</h1><p>${safeBody}</p>
    ${safe ? `<p><a href="${escapeHtml(safe)}/settings">Return to app</a></p>` : ""}
    </div></body></html>`,
    { headers: { "Content-Type": "text/html" } },
  );
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) return htmlResponse("Connection canceled", `Microsoft returned: ${error}`);
  if (!code || !state) return htmlResponse("Missing code", "Required parameters were missing.");

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: stateRow } = await admin
    .from("oauth_state")
    .select("*")
    .eq("state", state)
    .maybeSingle();

  if (!stateRow || new Date(stateRow.expires_at) < new Date()) {
    return htmlResponse("Session expired", "Please try connecting again.");
  }
  await admin.from("oauth_state").delete().eq("state", state);

  const { data: oauthApp } = await admin
    .from("user_oauth_apps")
    .select("client_id, client_secret")
    .eq("workspace_id", stateRow.workspace_id)
    .eq("provider", "microsoft")
    .maybeSingle();

  if (!oauthApp) return htmlResponse("OAuth app missing", "Credentials were removed mid-flow.");

  const callbackUrl = `${SUPABASE_URL}/functions/v1/oauth-microsoft-callback`;

  const tokenRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: oauthApp.client_id,
      client_secret: oauthApp.client_secret,
      redirect_uri: callbackUrl,
      grant_type: "authorization_code",
    }),
  });
  const tokenJson = await tokenRes.json();
  if (!tokenRes.ok) {
    console.error("Microsoft token exchange failed", tokenJson);
    return htmlResponse("Token exchange failed", tokenJson.error_description ?? tokenJson.error ?? "Unknown error", stateRow.redirect_to);
  }

  const profileRes = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });
  const profile = await profileRes.json();
  const emailAddress = profile.mail ?? profile.userPrincipalName;

  const expiresAt = new Date(Date.now() + (tokenJson.expires_in ?? 3600) * 1000).toISOString();

  await admin.from("email_accounts").upsert(
    {
      workspace_id: stateRow.workspace_id,
      user_id: stateRow.user_id,
      provider: "outlook",
      email_address: emailAddress,
      display_name: profile.displayName ?? null,
      access_token: tokenJson.access_token,
      refresh_token: tokenJson.refresh_token ?? "",
      access_token_expires_at: expiresAt,
      status: "active",
      last_synced_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id,email_address" },
  );

  return htmlResponse(
    "Outlook connected ✅",
    `${emailAddress} is now linked. Replies will land in the lead's conversation.`,
    stateRow.redirect_to,
  );
});
