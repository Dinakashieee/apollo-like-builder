import { useEffect, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useWorkspace } from "./useWorkspace";

export interface PresenceUser {
  user_id: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  online_at: string;
}

/**
 * Tracks who is currently online in the active workspace using Supabase Realtime presence.
 * Returns a deduplicated list of online users.
 */
export function usePresence() {
  const { user } = useAuth();
  const { current } = useWorkspace();
  const [online, setOnline] = useState<PresenceUser[]>([]);
  const userId = user?.id;
  const userEmail = user?.email;
  const workspaceId = current?.id;

  useEffect(() => {
    setOnline([]);
    if (!userId || !workspaceId) return;

    let cancelled = false;
    let channel: RealtimeChannel | undefined;

    (async () => {
      // Fetch profile to broadcast richer info
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, email")
        .eq("id", userId)
        .maybeSingle();

      if (cancelled) return;

      const activeChannel = supabase.channel(`presence:ws:${workspaceId}`, {
        config: { presence: { key: userId } },
      });
      channel = activeChannel;

      activeChannel
        .on("presence", { event: "sync" }, () => {
          if (cancelled) return;
          const state = activeChannel.presenceState<PresenceUser>();
          // Dedupe by user_id (one user can have multiple tabs)
          const map = new Map<string, PresenceUser>();
          Object.values(state).forEach((entries) => {
            entries.forEach((p) => {
              if (!map.has(p.user_id)) map.set(p.user_id, p);
            });
          });
          setOnline(Array.from(map.values()));
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED" && !cancelled) {
            await activeChannel.track({
              user_id: userId,
              email: profile?.email ?? userEmail ?? "",
              full_name: profile?.full_name ?? "",
              avatar_url: profile?.avatar_url ?? "",
              online_at: new Date().toISOString(),
            } satisfies PresenceUser);
          }
        });

    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [userId, userEmail, workspaceId]);

  return { online, count: online.length };
}
