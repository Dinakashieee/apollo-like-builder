import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";

export interface SignalHireCredits {
  balance: number;
  lifetimePurchased: number;
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useSignalHireCredits(): SignalHireCredits {
  const { current } = useWorkspace();
  const workspaceId = current?.id;
  const [balance, setBalance] = useState(0);
  const [lifetimePurchased, setLifetimePurchased] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchCredits = useCallback(async () => {
    if (!workspaceId) return;
    const { data } = await supabase
      .from("workspace_signalhire_credits")
      .select("balance, lifetime_purchased")
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    setBalance(data?.balance ?? 0);
    setLifetimePurchased(data?.lifetime_purchased ?? 0);
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) return;
    fetchCredits();
    const ch = supabase
      .channel(`sh-credits-${workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "workspace_signalhire_credits",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        () => fetchCredits(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [workspaceId, fetchCredits]);

  return { balance, lifetimePurchased, loading, refetch: fetchCredits };
}
