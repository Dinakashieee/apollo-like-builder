import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Flame, Sun, Snowflake, Minus, Sparkles, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";

type Temp = "hot" | "warm" | "cold" | "neutral";

interface RecentReply {
  id: string;
  thread_id: string;
  from_email: string;
  from_name: string | null;
  subject: string | null;
  reply_summary: string | null;
  suggested_next_step: string | null;
  reply_temperature: Temp | null;
  reply_intent: string | null;
  sent_at: string;
}

const TEMP: Record<Temp, { cls: string; icon: typeof Flame; label: string; bar: string }> = {
  hot: { cls: "text-hot", icon: Flame, label: "Hot", bar: "bg-hot" },
  warm: { cls: "text-warm", icon: Sun, label: "Warm", bar: "bg-warm" },
  cold: { cls: "text-primary", icon: Snowflake, label: "Cold", bar: "bg-primary" },
  neutral: { cls: "text-muted-foreground", icon: Minus, label: "Neutral", bar: "bg-muted-foreground/40" },
};

export function ReplyTemperatureTile() {
  const { current } = useWorkspace();
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<Temp, number>>({ hot: 0, warm: 0, cold: 0, neutral: 0 });
  const [recent, setRecent] = useState<RecentReply[]>([]);

  useEffect(() => {
    if (!current?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data } = await supabase
        .from("email_messages")
        .select(
          "id, thread_id, from_email, from_name, subject, reply_summary, suggested_next_step, reply_temperature, reply_intent, sent_at",
        )
        .eq("workspace_id", current.id)
        .eq("direction", "inbound")
        .gte("sent_at", since)
        .order("sent_at", { ascending: false })
        .limit(50);
      if (cancelled) return;
      const rows = (data as RecentReply[]) ?? [];
      const c: Record<Temp, number> = { hot: 0, warm: 0, cold: 0, neutral: 0 };
      for (const r of rows) {
        if (r.reply_temperature) c[r.reply_temperature] += 1;
      }
      setCounts(c);
      setRecent(rows.slice(0, 5));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [current?.id]);

  const total = useMemo(() => counts.hot + counts.warm + counts.cold + counts.neutral, [counts]);

  return (
    <div className="card-elevated p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-display font-bold text-base text-primary-deep flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Reply temperature · last 30 days
        </h3>
        <span className="text-xs text-muted-foreground">{total} analyzed replies</span>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : total === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-8">
          No analyzed replies yet. Connect a company mailbox or open a lead's conversation and click "Analyze" on an inbound reply.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
              Breakdown
            </p>
            {(["hot", "warm", "cold", "neutral"] as Temp[]).map((k) => {
              const meta = TEMP[k];
              const Icon = meta.icon;
              const pct = total > 0 ? (counts[k] / total) * 100 : 0;
              return (
                <div key={k}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className={`flex items-center gap-1.5 font-medium ${meta.cls}`}>
                      <Icon className="h-3.5 w-3.5" />
                      {meta.label}
                    </span>
                    <span className="text-muted-foreground">
                      {counts[k]} <span className="text-xs">({pct.toFixed(0)}%)</span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full ${meta.bar} transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">
              Suggested next steps
            </p>
            {recent.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No recent analyzed replies.
              </p>
            ) : (
              recent.map((r) => {
                const meta = r.reply_temperature ? TEMP[r.reply_temperature] : null;
                const Icon = meta?.icon;
                return (
                  <Link
                    key={r.id}
                    to="/app/leads"
                    className="block rounded-lg border border-border/60 hover:border-primary/40 p-2.5 transition"
                  >
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className="text-xs font-semibold text-primary-deep truncate">
                        {r.from_name || r.from_email}
                      </p>
                      {meta && Icon && (
                        <span className={`flex items-center gap-1 text-[10px] font-bold ${meta.cls}`}>
                          <Icon className="h-3 w-3" />
                          {meta.label}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {r.suggested_next_step || r.reply_summary || r.subject || "—"}
                    </p>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                      {formatDistanceToNow(new Date(r.sent_at), { addSuffix: true })}
                    </p>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
