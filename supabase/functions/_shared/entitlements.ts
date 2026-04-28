// Shared entitlement helpers for edge functions.
// Caller must pass a service-role Supabase client.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export const FREE_LIMITS = {
  leads: 50,
  ai_emails: 20,
} as const;

export const STARTER_LIMITS = {
  leads: 2500,
  ai_emails: 2000,
} as const;

export type Tier = "free" | "starter" | "pro";

export async function getWorkspaceTier(
  admin: SupabaseClient,
  workspaceId: string,
): Promise<Tier> {
  const { data } = await admin.rpc("get_workspace_owner_tier", { _workspace_id: workspaceId });
  return ((data as string) || "free") as Tier;
}

export async function getCurrentAiEmails(
  admin: SupabaseClient,
  workspaceId: string,
): Promise<number> {
  const { data } = await admin.rpc("get_current_ai_emails", { _workspace_id: workspaceId });
  return (data as number) ?? 0;
}

export async function incrementAiEmails(
  admin: SupabaseClient,
  workspaceId: string,
): Promise<number> {
  const { data } = await admin.rpc("increment_ai_emails", { _workspace_id: workspaceId });
  return (data as number) ?? 0;
}

export async function getLeadCount(
  admin: SupabaseClient,
  workspaceId: string,
): Promise<number> {
  const { data } = await admin.rpc("current_lead_count", { _workspace_id: workspaceId });
  return (data as number) ?? 0;
}

/**
 * Returns null if allowed, or an object describing why blocked.
 */
export async function checkAiEmailQuota(
  admin: SupabaseClient,
  workspaceId: string,
): Promise<{ blocked: true; reason: string; tier: Tier; used: number; limit: number } | null> {
  const tier = await getWorkspaceTier(admin, workspaceId);
  if (tier !== "free") return null;
  const used = await getCurrentAiEmails(admin, workspaceId);
  if (used >= FREE_LIMITS.ai_emails) {
    return {
      blocked: true,
      reason: `Free plan limit reached (${FREE_LIMITS.ai_emails} AI emails / month). Upgrade to send more.`,
      tier,
      used,
      limit: FREE_LIMITS.ai_emails,
    };
  }
  return null;
}

export async function checkLeadQuota(
  admin: SupabaseClient,
  workspaceId: string,
): Promise<{ blocked: true; reason: string; tier: Tier; used: number; limit: number } | null> {
  const tier = await getWorkspaceTier(admin, workspaceId);
  const limit = tier === "free" ? FREE_LIMITS.leads : tier === "starter" ? STARTER_LIMITS.leads : Infinity;
  if (!isFinite(limit)) return null;
  const used = await getLeadCount(admin, workspaceId);
  if (used >= limit) {
    return {
      blocked: true,
      reason: `${tier === "free" ? "Free" : "Starter"} plan limit reached (${limit} leads). Upgrade to add more.`,
      tier,
      used,
      limit,
    };
  }
  return null;
}
