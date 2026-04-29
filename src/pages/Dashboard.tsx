import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Mail,
  MailOpen,
  Reply,
  DollarSign,
  TrendingUp,
  Sparkles,
  Send,
  ArrowUpRight,
  Plus,
  Activity,
  Target,
  Radio,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip as RTooltip,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { AddLeadDialog } from "@/components/AddLeadDialog";
import { ImportDialog } from "@/components/ImportDialog";
import { DashboardCustomizer } from "@/components/DashboardCustomizer";
import { useDashboardPrefs, type TileKey } from "@/hooks/useDashboardPrefs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Globe } from "lucide-react";
import { findCountry, regionOf } from "@/lib/countries";
import { ReplyTemperatureTile } from "@/components/ReplyTemperatureTile";

type Range = "1D" | "7D" | "30D" | "QTD";
const RANGE_DAYS: Record<Range, number> = { "1D": 1, "7D": 7, "30D": 30, "QTD": 90 };

interface Stats {
  emails: number;
  emailsPrev: number;
  opens: number;
  opensPrev: number;
  replies: number;
  repliesPrev: number;
  pipeline: number;
  pipelinePrev: number;
  delivered: number;
  meetings: number;
  hotLeads: number;
}

interface VelocityPoint {
  day: string;
  newPipeline: number;
  stalled: number;
}

interface ActivityRow {
  id: string;
  recipient_email: string;
  template_name: string;
  status: string;
  created_at: string;
}

const fmtNumber = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${n}`;
const fmtCurrency = (n: number) =>
  n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`;
const pct = (a: number, b: number) => (b === 0 ? (a > 0 ? 100 : 0) : ((a - b) / b) * 100);

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  sent: { label: "Sending", cls: "bg-warm/15 text-warm" },
  pending: { label: "Sending", cls: "bg-warm/15 text-warm" },
  delivered: { label: "Delivered", cls: "bg-primary/15 text-primary" },
  opened: { label: "Opened", cls: "bg-hot/15 text-hot" },
  replied: { label: "Replied", cls: "bg-success/15 text-success" },
  failed: { label: "Failed", cls: "bg-destructive/15 text-destructive" },
  dlq: { label: "Failed", cls: "bg-destructive/15 text-destructive" },
  suppressed: { label: "Suppressed", cls: "bg-muted text-muted-foreground" },
};

export default function Dashboard() {
  const { current } = useWorkspace();
  const { user } = useAuth();
  const { visible, save, loaded } = useDashboardPrefs();
  const [profileName, setProfileName] = useState("");
  const [range, setRange] = useState<Range>("7D");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    emails: 0, emailsPrev: 0, opens: 0, opensPrev: 0,
    replies: 0, repliesPrev: 0, pipeline: 0, pipelinePrev: 0,
    delivered: 0, meetings: 0, hotLeads: 0,
  });
  const [velocity, setVelocity] = useState<VelocityPoint[]>([]);
  const [liveActivity, setLiveActivity] = useState<ActivityRow[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [leadsGeo, setLeadsGeo] = useState<{ country: string | null; count: number }[]>([]);

  const days = RANGE_DAYS[range];
  const showTile = (k: TileKey) => visible.includes(k);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) =>
        setProfileName(data?.full_name?.split(" ")[0] ?? user.email?.split("@")[0] ?? ""),
      );
  }, [user]);

  useEffect(() => {
    if (!current) return;
    let cancelled = false;

    const refresh = async () => {
      setLoading(true);
      const now = new Date();
      const start = new Date(now.getTime() - days * 86400000);
      const prevStart = new Date(now.getTime() - 2 * days * 86400000);
      const startIso = start.toISOString();
      const prevStartIso = prevStart.toISOString();

      const [
        emailsRes,
        emailsPrevRes,
        oppsRes,
        leadsHotRes,
        leadsAllRes,
        velocityRes,
        liveRes,
      ] = await Promise.all([
        supabase
          .from("email_send_log")
          .select("message_id, status, created_at")
          .gte("created_at", startIso)
          .order("created_at", { ascending: false })
          .limit(1000),
        supabase
          .from("email_send_log")
          .select("message_id, status, created_at")
          .gte("created_at", prevStartIso)
          .lt("created_at", startIso)
          .limit(1000),
        supabase
          .from("opportunities")
          .select("id, title, industry, score, level, problem")
          .eq("workspace_id", current.id)
          .order("score", { ascending: false })
          .limit(5),
        supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", current.id)
          .gte("score", 70),
        supabase
          .from("leads")
          .select("id, score, created_at, status")
          .eq("workspace_id", current.id)
          .gte("created_at", prevStartIso)
          .order("created_at", { ascending: false })
          .limit(2000),
        supabase
          .from("leads")
          .select("created_at, status")
          .eq("workspace_id", current.id)
          .gte("created_at", new Date(now.getTime() - 15 * 86400000).toISOString()),
        supabase
          .from("email_send_log")
          .select("id, recipient_email, template_name, status, created_at, message_id")
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      if (cancelled) return;

      // Dedup emails by message_id (latest status per message)
      const dedup = (rows: any[]) => {
        const m = new Map<string, any>();
        for (const r of rows ?? []) {
          if (!r.message_id) continue;
          if (!m.has(r.message_id)) m.set(r.message_id, r);
        }
        return [...m.values()];
      };
      const cur = dedup(emailsRes.data ?? []);
      const prev = dedup(emailsPrevRes.data ?? []);

      const sentLike = (s: string) => ["sent", "delivered", "opened", "replied"].includes(s);
      const openedLike = (s: string) => ["opened", "replied"].includes(s);
      const repliedLike = (s: string) => s === "replied";

      const sent = cur.filter((r) => sentLike(r.status)).length;
      const sentPrev = prev.filter((r) => sentLike(r.status)).length;
      const opened = cur.filter((r) => openedLike(r.status)).length;
      const openedPrev = prev.filter((r) => openedLike(r.status)).length;
      const replied = cur.filter((r) => repliedLike(r.status)).length;
      const repliedPrev = prev.filter((r) => repliedLike(r.status)).length;
      const delivered = cur.filter((r) => ["delivered", "opened", "replied"].includes(r.status)).length;

      // Pipeline = leads scored >=60 created in window, valued at $4k/lead (heuristic)
      const leads = leadsAllRes.data ?? [];
      const pipelineLeads = leads.filter(
        (l) => new Date(l.created_at) >= start && (l.score ?? 0) >= 60,
      );
      const pipelinePrevLeads = leads.filter(
        (l) =>
          new Date(l.created_at) >= prevStart &&
          new Date(l.created_at) < start &&
          (l.score ?? 0) >= 60,
      );
      const pipeline = pipelineLeads.length * 4000;
      const pipelinePrev = pipelinePrevLeads.length * 4000;
      const meetings = leads.filter((l) => l.status === "qualified" || l.status === "won").length;

      setStats({
        emails: sent,
        emailsPrev: sentPrev,
        opens: opened,
        opensPrev: openedPrev,
        replies: replied,
        repliesPrev: repliedPrev,
        pipeline,
        pipelinePrev,
        delivered,
        meetings,
        hotLeads: leadsHotRes.count ?? 0,
      });

      // Velocity: 15-day buckets
      const vel: VelocityPoint[] = [];
      for (let i = 14; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 86400000);
        const dayKey = d.toISOString().slice(0, 10);
        const dayLeads = (velocityRes.data ?? []).filter(
          (l) => l.created_at.slice(0, 10) === dayKey,
        );
        const stalled = dayLeads.filter(
          (l) => l.status === "lost",
        ).length;
        vel.push({
          day: d.toLocaleDateString("en", { month: "short", day: "numeric" }),
          newPipeline: dayLeads.length,
          stalled,
        });
      }
      setVelocity(vel);

      setLiveActivity((liveRes.data ?? []) as ActivityRow[]);
      setOpportunities(oppsRes.data ?? []);
      setLoading(false);
    };

    refresh();

    // Realtime: live email activity
    const channel = supabase
      .channel("dashboard-email-log")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "email_send_log" },
        () => refresh(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [current?.id, days]);

  // Leads-by-country aggregate (independent of date range)
  useEffect(() => {
    if (!current?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("leads")
        .select("country")
        .eq("workspace_id", current.id)
        .limit(5000);
      if (cancelled || !data) return;
      const counts = new Map<string | null, number>();
      for (const row of data) {
        const k = (row as any).country ?? null;
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
      const arr = Array.from(counts.entries())
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count);
      setLeadsGeo(arr);
    })();
    return () => { cancelled = true; };
  }, [current?.id]);

  // Aggregate by region for the geo tile
  const geoByRegion = useMemo(() => {
    const map = new Map<string, number>();
    let total = 0;
    for (const row of leadsGeo) {
      const region = row.country ? regionOf(row.country) : "Unknown";
      map.set(region, (map.get(region) ?? 0) + row.count);
      total += row.count;
    }
    return {
      total,
      regions: Array.from(map.entries())
        .map(([region, count]) => ({ region, count }))
        .sort((a, b) => b.count - a.count),
    };
  }, [leadsGeo]);

  const openRate = stats.delivered > 0 ? (stats.opens / stats.delivered) * 100 : 0;
  const openRatePrev =
    stats.emailsPrev > 0 ? (stats.opensPrev / Math.max(stats.emailsPrev, 1)) * 100 : 0;
  const replyRate = stats.delivered > 0 ? (stats.replies / stats.delivered) * 100 : 0;
  const replyRatePrev =
    stats.emailsPrev > 0 ? (stats.repliesPrev / Math.max(stats.emailsPrev, 1)) * 100 : 0;

  const funnel = useMemo(() => {
    const sent = stats.emails;
    const delivered = stats.delivered;
    const opened = stats.opens;
    const replied = stats.replies;
    const meetings = stats.meetings;
    const max = Math.max(sent, 1);
    return [
      { label: "Sent", count: sent, color: "bg-primary", pct: (sent / max) * 100 },
      { label: "Delivered", count: delivered, color: "bg-primary/70", pct: (delivered / max) * 100 },
      { label: "Opened", count: opened, color: "bg-hot", pct: (opened / max) * 100 },
      { label: "Replied", count: replied, color: "bg-success", pct: (replied / max) * 100 },
      { label: "Meetings", count: meetings, color: "bg-primary-deep", pct: (meetings / max) * 100 },
    ];
  }, [stats]);

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground font-medium mb-1">
            Welcome back{profileName ? `, ${profileName}` : ""} 👋
          </p>
          <h1 className="text-3xl lg:text-4xl font-display font-bold text-primary-deep">
            Sales Intelligence
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time outreach performance · auto-refreshed
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ToggleGroup
            type="single"
            value={range}
            onValueChange={(v) => v && setRange(v as Range)}
            className="bg-card border rounded-xl p-0.5 shadow-sm"
          >
            {(["1D", "7D", "30D", "QTD"] as Range[]).map((r) => (
              <ToggleGroupItem
                key={r}
                value={r}
                className="h-7 px-3 text-xs font-semibold data-[state=on]:bg-primary data-[state=on]:text-primary-foreground rounded-lg"
              >
                {r}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <DashboardCustomizer visible={visible} onChange={save} />
          <ImportDialog onImported={() => {}} />
          <AddLeadDialog onCreated={() => {}} />
        </div>
      </div>

      {/* KPI tiles */}
      {showTile("kpis") && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={Mail}
            label="Emails sent"
            value={loading ? null : fmtNumber(stats.emails)}
            delta={pct(stats.emails, stats.emailsPrev)}
            spark={velocity.map((v) => v.newPipeline)}
            sparkColor="hsl(var(--primary))"
          />
          <KpiCard
            icon={MailOpen}
            label="Open rate"
            value={loading ? null : `${openRate.toFixed(0)}%`}
            delta={openRate - openRatePrev}
            unit="pt"
            spark={velocity.map((v) => v.newPipeline * 0.5 + 2)}
            sparkColor="hsl(var(--hot))"
          />
          <KpiCard
            icon={Reply}
            label="Reply rate"
            value={loading ? null : `${replyRate.toFixed(1)}%`}
            delta={replyRate - replyRatePrev}
            unit="pt"
            spark={velocity.map((v) => Math.max(v.newPipeline - v.stalled, 0))}
            sparkColor="hsl(var(--success))"
          />
          <KpiCard
            icon={DollarSign}
            label="Pipeline added"
            value={loading ? null : fmtCurrency(stats.pipeline)}
            delta={pct(stats.pipeline, stats.pipelinePrev)}
            spark={velocity.map((v) => v.newPipeline * 4)}
            sparkColor="hsl(var(--primary-glow))"
          />
        </div>
      )}

      {/* Velocity + Live activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {showTile("velocity") && (
          <div className={`card-elevated p-6 ${showTile("live_activity") ? "lg:col-span-2" : "lg:col-span-3"}`}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-display font-bold text-lg text-primary-deep flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Pipeline velocity
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Last 15 days · updated just now
                </p>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-primary" /> New
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/50" /> Stalled
                </span>
              </div>
            </div>
            <div className="h-44 -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={velocity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="newGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    interval={2}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    width={28}
                  />
                  <RTooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid hsl(var(--border))",
                      fontSize: 12,
                      boxShadow: "var(--shadow-card)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="newPipeline"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    fill="url(#newGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="stalled"
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    fill="transparent"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {showTile("funnel") && (
              <div className="mt-6 pt-5 border-t">
                <p className="text-sm font-semibold text-primary-deep mb-3">
                  Outreach funnel · this {range === "1D" ? "day" : range === "7D" ? "week" : "period"}
                </p>
                <div className="space-y-2.5">
                  {funnel.map((row) => (
                    <div key={row.label} className="flex items-center gap-3 text-xs">
                      <span className="w-20 text-muted-foreground">{row.label}</span>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full ${row.color} rounded-full transition-all`}
                          style={{ width: `${Math.max(row.pct, row.count > 0 ? 4 : 0)}%` }}
                        />
                      </div>
                      <span className="w-12 text-right font-semibold text-primary-deep tabular-nums">
                        {row.count.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {showTile("live_activity") && (
          <div className={`card-elevated p-6 ${!showTile("velocity") ? "lg:col-span-3" : ""}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-base text-primary-deep flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Live email activity
              </h3>
              <span className="flex items-center gap-1.5 text-[10px] font-semibold text-success">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
                </span>
                streaming
              </span>
            </div>
            <div className="space-y-2 max-h-[420px] overflow-y-auto -mx-2 px-2">
              {loading && Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
              {!loading && liveActivity.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-8">
                  No email activity yet. Send your first sequence to see live events here.
                </p>
              )}
              {liveActivity.slice(0, 8).map((row) => {
                const badge = STATUS_BADGE[row.status] ?? { label: row.status, cls: "bg-muted text-muted-foreground" };
                const company = row.recipient_email.split("@")[1]?.split(".")[0] ?? row.recipient_email;
                return (
                  <div
                    key={row.id}
                    className="flex items-start gap-3 p-3 rounded-xl border border-border/60 hover:border-primary/40 hover:bg-muted/30 transition-colors"
                  >
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Send className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-primary-deep capitalize truncate">
                          {company}
                        </p>
                        <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                          {new Date(row.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {row.template_name.replace(/_/g, " ")}
                      </p>
                      <p className="text-[10px] text-muted-foreground/80 truncate">
                        {row.recipient_email}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${badge.cls} shrink-0 self-center`}
                    >
                      {badge.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Reply temperature */}
      {showTile("reply_temperature") && <ReplyTemperatureTile />}

      {/* Leads by country / region */}
      {showTile("leads_geo") && (
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="font-display font-bold text-base text-primary-deep flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              Leads by country & region
            </h3>
            <span className="text-xs text-muted-foreground">
              {geoByRegion.total} total · {leadsGeo.filter(r => r.country).length} countries
            </span>
          </div>
          {leadsGeo.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              No leads yet. Add leads with a country to see geographic insights.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Region breakdown */}
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3 font-semibold">
                  By region
                </p>
                <div className="space-y-2">
                  {geoByRegion.regions.map((r) => {
                    const pctRegion = geoByRegion.total > 0 ? (r.count / geoByRegion.total) * 100 : 0;
                    return (
                      <div key={r.region}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-medium text-primary-deep">{r.region}</span>
                          <span className="text-muted-foreground">
                            {r.count} <span className="text-xs">({pctRegion.toFixed(0)}%)</span>
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-gradient-primary"
                            style={{ width: `${pctRegion}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Top countries */}
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3 font-semibold">
                  Top countries
                </p>
                <div className="space-y-2">
                  {leadsGeo.slice(0, 8).map((row) => {
                    const c = findCountry(row.country);
                    const label = c?.name ?? (row.country ?? "Unspecified");
                    const pctCountry = geoByRegion.total > 0 ? (row.count / geoByRegion.total) * 100 : 0;
                    return (
                      <div
                        key={row.country ?? "none"}
                        className="flex items-center justify-between text-sm py-1.5 px-2 rounded-md hover:bg-muted/50"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-primary-deep truncate">{label}</p>
                          {c && (
                            <p className="text-[11px] text-muted-foreground truncate">{c.law}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <p className="font-semibold text-primary">{row.count}</p>
                          <p className="text-[11px] text-muted-foreground">{pctCountry.toFixed(0)}%</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Top opportunities + AI insight */}
      {(showTile("top_opportunities") || showTile("ai_insight")) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {showTile("top_opportunities") && (
            <div className="card-elevated p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-base text-primary-deep flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Top opportunities
                </h3>
                <Link to="/app/intelligence">
                  <Button variant="ghost" size="sm" className="text-primary text-xs h-8">
                    View all <ArrowUpRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
                </div>
              ) : opportunities.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">
                  No opportunities yet. Generate them in the Intelligence tab.
                </p>
              ) : (
                <div className="space-y-2">
                  {opportunities.map((o, idx) => {
                    const initials = o.title?.slice(0, 2).toUpperCase() ?? "??";
                    const colors = ["bg-success/15 text-success", "bg-primary/15 text-primary", "bg-hot/15 text-hot"];
                    return (
                      <div
                        key={o.id}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/40 transition-colors"
                      >
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-xs font-bold ${colors[idx % 3]}`}>
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-primary-deep truncate">
                            {o.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {o.problem ?? o.industry ?? "—"}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-primary-deep tabular-nums">{o.score ?? 0}</p>
                          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">intent</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {showTile("ai_insight") && (
            <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/8 via-card to-warm/5 p-6 shadow-elevated relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/15 blur-3xl rounded-full pointer-events-none" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
                    <Sparkles className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      AI insight · just now
                    </p>
                    <h3 className="font-display font-bold text-base text-primary-deep">
                      Suggested next move
                    </h3>
                  </div>
                </div>

                <p className="text-sm text-foreground/85 leading-relaxed mb-4">
                  {stats.hotLeads > 0 ? (
                    <>
                      You have <strong className="text-primary-deep">{stats.hotLeads} hot leads</strong> scoring 70+.
                      Drafting a personalized outreach sequence today could lift your reply rate by an
                      estimated <strong className="text-primary">+12pp</strong>.
                    </>
                  ) : stats.emails > 0 ? (
                    <>
                      Your reply rate is{" "}
                      <strong className="text-primary-deep">{replyRate.toFixed(1)}%</strong>. Try the
                      "RevOps benchmarks" angle on your next sequence — predicted reply rate{" "}
                      <strong className="text-primary">{Math.min(replyRate + 8, 41).toFixed(0)}%</strong>.
                    </>
                  ) : (
                    <>
                      Add your first leads and run a sequence — EngageIQ will start surfacing
                      pattern insights after ~25 sends.
                    </>
                  )}
                </p>

                <div className="flex items-center gap-2 flex-wrap">
                  <Link to="/app/composer">
                    <Button size="sm" className="h-8 text-xs gap-1.5">
                      <Sparkles className="h-3 w-3" />
                      Launch sequence
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm" className="h-8 text-xs">
                    Dismiss
                  </Button>
                </div>

                <div className="mt-4 pt-3 border-t border-primary/10 flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Radio className="h-3 w-3" /> Saved 9.2h this week
                  </span>
                  <span className="font-semibold text-success">+22% pipeline</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty fallback if all hidden */}
      {visible.length === 0 && loaded && (
        <div className="card-elevated p-10 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            All tiles hidden. Use <strong>Customize</strong> to bring some back.
          </p>
        </div>
      )}
    </div>
  );
}

interface KpiCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null;
  delta: number;
  unit?: "pt";
  spark: number[];
  sparkColor: string;
}

function KpiCard({ icon: Icon, label, value, delta, unit, spark, sparkColor }: KpiCardProps) {
  const positive = delta >= 0;
  const deltaStr = `${positive ? "+" : ""}${unit === "pt" ? delta.toFixed(1) + "pt" : delta.toFixed(0) + "%"}`;
  const points = spark.length > 0 ? spark : [1, 2, 1, 3, 2, 4, 3];
  const max = Math.max(...points, 1);
  const min = Math.min(...points);
  const range = Math.max(max - min, 1);
  const w = 100;
  const h = 28;
  const path = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((p - min) / range) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div className="card-elevated p-4 relative overflow-hidden">
      <div className="flex items-start justify-between mb-2">
        <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-muted-foreground/60" />
      </div>
      {value === null ? (
        <Skeleton className="h-8 w-20 mb-2" />
      ) : (
        <p className="text-2xl lg:text-3xl font-display font-bold text-primary-deep tabular-nums leading-none mb-2">
          {value}
        </p>
      )}
      <div className="flex items-end justify-between gap-2">
        <span
          className={`text-[11px] font-bold ${positive ? "text-success" : "text-destructive"}`}
        >
          {deltaStr} vs last
        </span>
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="opacity-80">
          <path d={path} fill="none" stroke={sparkColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}
