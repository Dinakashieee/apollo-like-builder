import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (!user || !current) {
      setOnline([]);
      return;
    }

    let cancelled = false;

    (async () => {
      // Fetch profile to broadcast richer info
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, email")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      const channel = supabase.channel(`presence:ws:${current.id}`, {
        config: { presence: { key: user.id } },
      });

      channel
        .on("presence", { event: "sync" }, () => {
          const state = channel.presenceState<PresenceUser>();
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
          if (status === "SUBSCRIBED") {
            await channel.track({
              user_id: user.id,
              email: profile?.email ?? user.email ?? "",
              full_name: profile?.full_name ?? "",
              avatar_url: profile?.avatar_url ?? "",
              online_at: new Date().toISOString(),
            } satisfies PresenceUser);
          }
        });

      return () => {
        supabase.removeChannel(channel);
      };
    })();

    return () => {
      cancelled = true;
    };
  }, [user, current]);

  return { online, count: online.length };
}
