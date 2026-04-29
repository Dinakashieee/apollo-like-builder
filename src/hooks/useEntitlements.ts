import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "./useSubscription";
import { useAuth } from "./useAuth";
import { useWorkspace } from "./useWorkspace";
import { useWorkspaceAddons } from "./useWorkspaceAddons";

export const PLAN_LIMITS = {
  free: { leads: 10, ai_emails: 25, seats: 1 },
  starter: { leads: 1000, ai_emails: 2500, seats: 3 },
  growth: { leads: 4000, ai_emails: 10000, seats: 10 },
  pro: { leads: Infinity, ai_emails: Infinity, seats: Infinity },
} as const;

export function useEntitlements() {
  const { user } = useAuth();
  const { current } = useWorkspace();
  const { tier } = useSubscription(user?.id);
  const [leadsUsed, setLeadsUsed] = useState(0);
  const [aiEmailsUsed, setAiEmailsUsed] = useState(0);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!current) return;
    const periodStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .slice(0, 10);
    const [leadsRes, usageRes] = await Promise.all([
      supabase.from("leads").select("id", { count: "exact", head: true }).eq("workspace_id", current.id),
      supabase
        .from("usage_counters")
        .select("ai_emails_used")
        .eq("workspace_id", current.id)
        .eq("period_start", periodStart)
        .maybeSingle(),
    ]);
    setLeadsUsed(leadsRes.count ?? 0);
    setAiEmailsUsed(usageRes.data?.ai_emails_used ?? 0);
    setLoading(false);
  }, [current]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const baseLimits = PLAN_LIMITS[tier] ?? PLAN_LIMITS.free;
  const { extraSeats, extraCredits } = useWorkspaceAddons();

  const leadsLimit = baseLimits.leads;
  const aiEmailsLimit = isFinite(baseLimits.ai_emails)
    ? baseLimits.ai_emails + extraCredits
    : baseLimits.ai_emails;
  const seatsLimit = isFinite(baseLimits.seats)
    ? baseLimits.seats + extraSeats
    : baseLimits.seats;

  const leadsPct = isFinite(leadsLimit) ? leadsUsed / leadsLimit : 0;
  const aiEmailsPct = isFinite(aiEmailsLimit) ? aiEmailsUsed / aiEmailsLimit : 0;

  return {
    tier,
    loading,
    leadsUsed,
    leadsLimit,
    leadsAtLimit: leadsUsed >= leadsLimit,
    leadsNearLimit: leadsPct >= 0.8 && leadsPct < 1,
    aiEmailsUsed,
    aiEmailsLimit,
    aiEmailsAtLimit: aiEmailsUsed >= aiEmailsLimit,
    aiEmailsNearLimit: aiEmailsPct >= 0.8 && aiEmailsPct < 1,
    seatsLimit,
    extraSeats,
    extraCredits,
    refetch,
  };
}
