import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;

    const { provider, workspace_id } = await req.json();
    if (!["google", "microsoft"].includes(provider)) {
      return new Response(JSON.stringify({ error: "Bad provider" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Verify owner
    const { data: ws } = await admin
      .from("workspaces")
      .select("owner_id")
      .eq("id", workspace_id)
      .maybeSingle();
    if (!ws || ws.owner_id !== user.id) {
      return new Response(JSON.stringify({ error: "Only the workspace owner can connect a mailbox" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load BYO oauth app credentials
    const { data: oauthApp } = await admin
      .from("user_oauth_apps")
      .select("client_id")
      .eq("workspace_id", workspace_id)
      .eq("provider", provider)
      .maybeSingle();

    if (!oauthApp) {
      return new Response(
        JSON.stringify({
          error:
            "No OAuth credentials saved yet. Add your Client ID and Secret first.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Generate state
    const state = crypto.randomUUID() + "." + crypto.randomUUID();
    const origin = req.headers.get("origin") ?? "";
    await admin.from("oauth_state").insert({
      state,
      workspace_id,
      user_id: user.id,
      provider,
      redirect_to: origin,
    });

    const callbackUrl = `${SUPABASE_URL}/functions/v1/oauth-${provider}-callback`;

    let authorizeUrl = "";
    if (provider === "google") {
      const params = new URLSearchParams({
        client_id: oauthApp.client_id,
        redirect_uri: callbackUrl,
        response_type: "code",
        access_type: "offline",
        prompt: "consent",
        scope:
          "openid email profile https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify",
        state,
      });
      authorizeUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    } else {
      const params = new URLSearchParams({
        client_id: oauthApp.client_id,
        redirect_uri: callbackUrl,
        response_type: "code",
        response_mode: "query",
        scope:
          "openid email profile offline_access https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/User.Read",
        state,
        prompt: "select_account",
      });
      authorizeUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`;
    }

    return new Response(JSON.stringify({ url: authorizeUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("oauth-start error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
