import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "./useWorkspace";
import { getPaddleEnvironment } from "@/lib/paddle";

export interface WorkspaceAddon {
  id: string;
  product_id: "addon_seat" | "addon_credits_1k" | "addon_credits_5k" | "addon_leads_100" | string;
  price_id: string;
  quantity: number;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  paddle_subscription_id: string;
}

/** Aggregates active add-on entitlements (extra seats, credits, leads) for the current workspace. */
export function useWorkspaceAddons() {
  const { current } = useWorkspace();
  const [addons, setAddons] = useState<WorkspaceAddon[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!current) return;
    // Note: don't filter by environment — add-ons may be created via PayPal
    // (live) even when the Paddle preview client token is sandbox.
    const { data } = await supabase
      .from("workspace_addons")
      .select(
        "id, product_id, price_id, quantity, status, current_period_end, cancel_at_period_end, paddle_subscription_id"
      )
      .eq("workspace_id", current.id);
    setAddons((data ?? []) as WorkspaceAddon[]);
    setLoading(false);
  }, [current]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const isActive = (a: WorkspaceAddon) =>
    ["active", "trialing", "past_due"].includes(a.status) &&
    (!a.current_period_end || new Date(a.current_period_end) > new Date());

  const extraSeats = addons
    .filter((a) => a.product_id === "addon_seat" && isActive(a))
    .reduce((acc, a) => acc + (a.quantity || 1), 0);

  const extraCredits = addons.reduce((acc, a) => {
    if (!isActive(a)) return acc;
    if (a.product_id === "addon_credits_1k") return acc + 1000 * (a.quantity || 1);
    if (a.product_id === "addon_credits_5k") return acc + 5000 * (a.quantity || 1);
    return acc;
  }, 0);

  const extraLeads = addons
    .filter((a) => a.product_id === "addon_leads_100" && isActive(a))
    .reduce((acc, a) => acc + 100 * (a.quantity || 1), 0);

  return { addons, extraSeats, extraCredits, extraLeads, loading, refetch };
}
