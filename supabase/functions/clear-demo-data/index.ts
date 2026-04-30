// Deletes every row tagged is_demo=true for the caller's workspace.
// Returns the count of rows deleted per table so the UI can confirm.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json({ error: "unauthenticated" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: ud, error: ue } = await userClient.auth.getUser();
    if (ue || !ud.user) return json({ error: "unauthenticated" }, 401);

    const { workspaceId } = await req.json().catch(() => ({}));
    if (!workspaceId) return json({ error: "workspaceId required" }, 400);

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Only workspace owners can clear demo data
    const { data: ws } = await admin
      .from("workspaces")
      .select("owner_id")
      .eq("id", workspaceId)
      .maybeSingle();
    if (!ws || ws.owner_id !== ud.user.id) {
      return json({ error: "forbidden — only the workspace owner can clear demo data" }, 403);
    }

    // Delete in dependency order (children first)
    const counts: Record<string, number> = {};
    const tables = [
      "email_messages",
      "email_threads",
      "email_accounts",
      "sequence_step_status",
      "sequence_steps",
      "sequence_enrollments",
      "sequences",
      "opportunities",
      "activities",
      "leads",
    ] as const;

    for (const t of tables) {
      // sequence_step_status doesn't have is_demo — skip if column missing
      if (t === "sequence_step_status") continue;
      const { count, error } = await admin
        .from(t as any)
        .delete({ count: "exact" })
        .eq("workspace_id", workspaceId)
        .eq("is_demo", true);
      if (error) {
        console.warn(`clear-demo: ${t} failed`, error.message);
      } else {
        counts[t] = count ?? 0;
      }
    }

    // email_send_log uses metadata.workspace_id (no FK) — wipe demo rows for this workspace
    {
      const { count, error } = await admin
        .from("email_send_log")
        .delete({ count: "exact" })
        .eq("is_demo", true)
        .filter("metadata->>workspace_id", "eq", workspaceId);
      if (error) {
        console.warn("clear-demo: email_send_log failed", error.message);
      } else {
        counts["email_send_log"] = count ?? 0;
      }
    }

    // Reset workspace flags
    await admin
      .from("workspaces")
      .update({ demo_seeded_at: null, demo_banner_dismissed_at: new Date().toISOString() })
      .eq("id", workspaceId);

    return json({ ok: true, deleted: counts });
  } catch (e) {
    console.error("clear-demo-data error", e);
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});
