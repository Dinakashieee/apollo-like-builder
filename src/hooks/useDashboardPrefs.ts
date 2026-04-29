import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type TileKey =
  | "kpis"
  | "velocity"
  | "funnel"
  | "live_activity"
  | "top_opportunities"
  | "ai_insight"
  | "leads_geo"
  | "reply_temperature";

export const ALL_TILES: { key: TileKey; label: string; description: string }[] = [
  { key: "kpis", label: "KPI cards", description: "Emails sent, open rate, reply rate, pipeline added" },
  { key: "velocity", label: "Pipeline velocity", description: "15-day trend of new vs. stalled pipeline" },
  { key: "funnel", label: "Outreach funnel", description: "Sent → Delivered → Opened → Replied → Meetings" },
  { key: "live_activity", label: "Live email activity", description: "Real-time email events as they happen" },
  { key: "reply_temperature", label: "Reply temperature", description: "Hot / warm / cold breakdown of inbound replies + suggested next step" },
  { key: "top_opportunities", label: "Top opportunities", description: "Highest-intent accounts to work today" },
  { key: "ai_insight", label: "AI insight", description: "Recommended next action with predicted impact" },
  { key: "leads_geo", label: "Leads by country & region", description: "Geographic breakdown of leads in your pipeline" },
];

const DEFAULT_TILES: TileKey[] = ALL_TILES.map((t) => t.key);

export function useDashboardPrefs() {
  const { user } = useAuth();
  const [visible, setVisible] = useState<TileKey[]>(DEFAULT_TILES);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("user_dashboard_prefs")
        .select("visible_tiles")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data?.visible_tiles?.length) {
        setVisible(data.visible_tiles as TileKey[]);
      }
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const save = useCallback(
    async (tiles: TileKey[]) => {
      setVisible(tiles);
      if (!user) return;
      await supabase.from("user_dashboard_prefs").upsert(
        { user_id: user.id, visible_tiles: tiles, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
    },
    [user],
  );

  const isVisible = useCallback((k: TileKey) => visible.includes(k), [visible]);

  return { visible, isVisible, save, loaded };
}
