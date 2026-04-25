import { useEffect, useState } from "react";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

export function NotificationBell() {
  const { current } = useWorkspace();
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);

  const load = async () => {
    if (!current || !user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("workspace_id", current.id)
      .or(`user_id.is.null,user_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(20);
    setItems((data ?? []) as Notification[]);
  };

  useEffect(() => {
    load();
    if (!current) return;
    const channel = supabase
      .channel(`notif-${current.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `workspace_id=eq.${current.id}`,
        },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, user?.id]);

  const unread = items.filter((i) => !i.read).length;

  const markAllRead = async () => {
    if (!current) return;
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("workspace_id", current.id)
      .eq("read", false);
    load();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-[18px] w-[18px] text-muted-foreground" />
          {unread > 0 && (
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-hot ring-2 ring-card" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <p className="font-semibold text-sm">Notifications</p>
          {unread > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-primary font-medium flex items-center gap-1"
            >
              <Check className="h-3 w-3" /> Mark all read
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-auto divide-y">
          {items.length === 0 && (
            <p className="text-xs text-muted-foreground text-center p-6">No notifications yet.</p>
          )}
          {items.map((n) => (
            <div
              key={n.id}
              className={`p-3 ${!n.read ? "bg-primary/5" : ""}`}
            >
              <p className="text-sm font-medium">{n.title}</p>
              {n.body && <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>}
              <p className="text-[10px] text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
              </p>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
