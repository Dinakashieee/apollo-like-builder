import { useEffect, useMemo, useRef, useState } from "react";
import { Mail, MailCheck, MailOpen, Reply, TrendingUp, Zap, Users, DollarSign, Clock } from "lucide-react";

/**
 * LiveDashboardPreview
 * A rich, animated "live" analytics mockup designed to make landing-page
 * visitors feel the product's value: live email firing, animated charts,
 * funnel breakdown, and KPI sparklines.
 *
 * Pure presentational — no business logic, no network.
 */

type EmailEvent = {
  id: number;
  to: string;
  company: string;
  subject: string;
  status: "sending" | "delivered" | "opened" | "replied";
  time: string;
};

const SEED_EVENTS: Omit<EmailEvent, "id" | "time">[] = [
  { to: "sara.lin@northwind.co", company: "Northwind Co.", subject: "Quick idea on your RevOps hiring", status: "sending" },
  { to: "marc@acmerobotics.io", company: "Acme Robotics", subject: "Congrats on the Series B 🎉", status: "delivered" },
  { to: "priya@bluebirdlabs.com", company: "Bluebird Labs", subject: "Saw you switched off Salesforce", status: "opened" },
  { to: "j.okafor@helixhealth.io", company: "Helix Health", subject: "Re: pipeline visibility", status: "replied" },
  { to: "ana@vectorpay.com", company: "VectorPay", subject: "5 RevOps wins this quarter", status: "sending" },
  { to: "ken@orbitlogistics.com", company: "Orbit Logistics", subject: "Worth 12 minutes next week?", status: "delivered" },
  { to: "leah@quanta.ai", company: "Quanta AI", subject: "Your Q4 expansion playbook", status: "opened" },
];

const STATUS_STYLES: Record<EmailEvent["status"], { label: string; cls: string; Icon: typeof Mail }> = {
  sending:   { label: "Sending",   cls: "bg-primary/10 text-primary",          Icon: Mail },
  delivered: { label: "Delivered", cls: "bg-blue-500/10 text-blue-600",        Icon: MailCheck },
  opened:    { label: "Opened",    cls: "bg-amber-500/10 text-amber-600",      Icon: MailOpen },
  replied:   { label: "Replied",   cls: "bg-success/15 text-success",          Icon: Reply },
};

const formatTime = (d: Date) =>
  d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export function LiveDashboardPreview() {
  // --- Live email feed ----------------------------------------------------
  const [events, setEvents] = useState<EmailEvent[]>(() =>
    SEED_EVENTS.slice(0, 4).map((e, i) => ({
      ...e,
      id: i,
      time: formatTime(new Date(Date.now() - (4 - i) * 7000)),
    }))
  );
  const idRef = useRef(100);

  useEffect(() => {
    const interval = setInterval(() => {
      const seed = SEED_EVENTS[Math.floor(Math.random() * SEED_EVENTS.length)];
      idRef.current += 1;
      setEvents((prev) => [
        { ...seed, id: idRef.current, time: formatTime(new Date()) },
        ...prev,
      ].slice(0, 5));
    }, 1600);
    return () => clearInterval(interval);
  }, []);

  // --- Animated counters --------------------------------------------------
  const [sent, setSent] = useState(1284);
  const [opens, setOpens] = useState(642);
  const [replies, setReplies] = useState(217);
  const [pipeline, setPipeline] = useState(214);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setSent((s) => s + Math.floor(Math.random() * 4) + 1);
      setOpens((o) => o + Math.floor(Math.random() * 3));
      setReplies((r) => r + (Math.random() > 0.55 ? 1 : 0));
      setPipeline((p) => p + (Math.random() > 0.6 ? Math.floor(Math.random() * 5) + 1 : 0));
      setTick((n) => n + 1);
    }, 1200);
    return () => clearInterval(t);
  }, []);

  // --- Animated line chart points ----------------------------------------
  const trend = useMemo(
    () => [12, 18, 16, 24, 22, 30, 28, 36, 33, 42, 40, 48, 46, 56, 60],
    []
  );
  const trendStalled = useMemo(
    () => [8, 9, 10, 11, 10, 12, 13, 14, 14, 15, 14, 16, 17, 18, 18],
    []
  );

  const chartW = 480;
  const chartH = 140;
  const max = Math.max(...trend) + 8;
  const toPath = (data: number[]) => {
    const step = chartW / (data.length - 1);
    return data
      .map((v, i) => {
        const x = i * step;
        const y = chartH - (v / max) * chartH;
        return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  };
  const toAreaPath = (data: number[]) => `${toPath(data)} L ${chartW} ${chartH} L 0 ${chartH} Z`;

  // --- Channel funnel -----------------------------------------------------
  const funnel = [
    { label: "Sent",      value: sent,     pct: 100, color: "bg-primary" },
    { label: "Delivered", value: Math.round(sent * 0.97), pct: 97, color: "bg-blue-500" },
    { label: "Opened",    value: opens,    pct: Math.round((opens / sent) * 100), color: "bg-amber-500" },
    { label: "Replied",   value: replies,  pct: Math.round((replies / sent) * 100), color: "bg-success" },
    { label: "Meetings",  value: 38,       pct: 3, color: "bg-violet-500" },
  ];

  return (
    <div className="relative card-elevated overflow-hidden border border-border/60 shadow-elevated">
      {/* Window chrome */}
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border/60 bg-muted/30">
        <div className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
        <div className="h-2.5 w-2.5 rounded-full bg-hot/60" />
        <div className="h-2.5 w-2.5 rounded-full bg-success/60" />
        <span className="ml-3 text-[11px] text-muted-foreground font-medium">app.engageiq.com / dashboard</span>
        <span className="ml-auto text-[10px] font-bold bg-success/15 text-success px-2 py-1 rounded-md flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> LIVE
        </span>
      </div>

      <div className="p-4 sm:p-6 lg:p-7 bg-gradient-soft">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-display font-bold text-base sm:text-lg text-primary-deep">Sales Intelligence</h3>
            <p className="text-[11px] text-muted-foreground">Real-time outreach performance · auto-refreshed</p>
          </div>
          <div className="hidden sm:flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-card border border-border/60 rounded-md p-0.5">
            {["1D", "7D", "30D", "QTD"].map((t, i) => (
              <span key={t} className={`px-2 py-1 rounded ${i === 1 ? "bg-primary text-primary-foreground" : ""}`}>{t}</span>
            ))}
          </div>
        </div>

        {/* KPI row with mini sparklines */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4">
          {[
            { l: "Emails sent",     v: sent.toLocaleString(),      d: "+18% vs last wk", icon: Mail,        spark: [4,6,5,7,8,10,9,12], color: "text-primary",  bar: "from-primary/70 to-primary" },
            { l: "Open rate",       v: `${Math.round((opens / sent) * 100)}%`, d: "+6pt",          icon: TrendingUp,  spark: [3,4,4,5,6,6,7,8],  color: "text-amber-600", bar: "from-amber-300 to-amber-500" },
            { l: "Reply rate",      v: `${((replies / sent) * 100).toFixed(1)}%`, d: "+2.4pt",     icon: Reply,       spark: [2,3,3,4,4,5,5,6],  color: "text-success",  bar: "from-emerald-300 to-emerald-500" },
            { l: "Pipeline added",  v: `$${pipeline}k`,            d: "+22%",            icon: DollarSign,  spark: [5,7,6,8,9,10,12,14], color: "text-violet-600", bar: "from-violet-300 to-violet-500" },
          ].map((k) => {
            const Icon = k.icon;
            const sMax = Math.max(...k.spark);
            return (
              <div key={k.l} className="bg-card border border-border/60 rounded-xl p-3 group hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] text-muted-foreground font-medium truncate">{k.l}</p>
                  <Icon className={`h-3 w-3 ${k.color}`} />
                </div>
                <p className="text-lg sm:text-xl font-display font-bold text-primary-deep leading-tight tabular-nums">{k.v}</p>
                <div className="flex items-end justify-between gap-2 mt-1">
                  <p className="text-[10px] font-semibold text-success">{k.d}</p>
                  <div className="flex items-end gap-[2px] h-5">
                    {k.spark.map((v, i) => (
                      <div
                        key={i}
                        className={`w-[3px] rounded-sm bg-gradient-to-t ${k.bar} opacity-80`}
                        style={{ height: `${(v / sMax) * 100}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Main grid: chart + live feed */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 mb-3">
          {/* Animated line chart */}
          <div className="lg:col-span-3 bg-card border border-border/60 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs font-semibold text-primary-deep">Pipeline velocity</p>
                <p className="text-[10px] text-muted-foreground">Last 15 days · updated just now</p>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary" /> New</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-muted-foreground/40" /> Stalled</span>
              </div>
            </div>

            <div className="relative">
              <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-28 sm:h-32" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="grad-new" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="grad-stalled" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Grid */}
                {[0.25, 0.5, 0.75].map((p) => (
                  <line key={p} x1="0" x2={chartW} y1={chartH * p} y2={chartH * p} stroke="hsl(var(--border))" strokeDasharray="3 4" strokeWidth="0.5" />
                ))}
                {/* Stalled */}
                <path d={toAreaPath(trendStalled)} fill="url(#grad-stalled)" />
                <path d={toPath(trendStalled)} fill="none" stroke="hsl(var(--muted-foreground))" strokeOpacity="0.45" strokeWidth="1.5" strokeLinecap="round" />
                {/* New pipeline */}
                <path d={toAreaPath(trend)} fill="url(#grad-new)" />
                <path
                  d={toPath(trend)}
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="[stroke-dasharray:1000] [stroke-dashoffset:1000] [animation:dash_2.4s_ease-out_forwards]"
                />
                {/* End pulsing dot */}
                <circle
                  cx={chartW}
                  cy={chartH - (trend[trend.length - 1] / max) * chartH}
                  r="4"
                  fill="hsl(var(--primary))"
                  className="animate-pulse"
                />
              </svg>
              <style>{`@keyframes dash { to { stroke-dashoffset: 0; } }`}</style>
            </div>

            {/* Funnel under chart */}
            <div className="mt-4 space-y-1.5">
              <p className="text-[10px] font-semibold text-primary-deep mb-1">Outreach funnel · this week</p>
              {funnel.map((f) => (
                <div key={f.label} className="flex items-center gap-2">
                  <span className="w-16 text-[10px] text-muted-foreground">{f.label}</span>
                  <div className="flex-1 h-2 rounded-full bg-muted/60 overflow-hidden">
                    <div
                      className={`h-full ${f.color} rounded-full transition-all duration-700`}
                      style={{ width: `${Math.max(4, f.pct)}%` }}
                    />
                  </div>
                  <span className="w-14 text-right text-[10px] font-semibold text-primary-deep tabular-nums">
                    {f.value.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Live email activity */}
          <div className="lg:col-span-2 bg-card border border-border/60 rounded-xl p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-primary" />
                <p className="text-xs font-semibold text-primary-deep">Live email activity</p>
              </div>
              <span className="text-[10px] flex items-center gap-1 text-success font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> streaming
              </span>
            </div>
            <ul className="space-y-2 flex-1">
              {events.map((e, idx) => {
                const s = STATUS_STYLES[e.status];
                const Icon = s.Icon;
                return (
                  <li
                    key={e.id}
                    className="flex items-start gap-2 p-2 rounded-lg bg-muted/30 border border-border/40 animate-fade-up"
                    style={{ animationDelay: `${idx * 30}ms`, animationDuration: "350ms" }}
                  >
                    <div className={`h-7 w-7 shrink-0 rounded-md ${s.cls} flex items-center justify-center`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-semibold text-primary-deep truncate">{e.company}</p>
                        <span className="text-[9px] text-muted-foreground tabular-nums shrink-0">{e.time}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">{e.subject}</p>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <span className="text-[9px] text-muted-foreground/80 truncate">{e.to}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${s.cls}`}>{s.label}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Bottom row: top opportunities + AI insight */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-3 bg-card border border-border/60 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-primary-deep flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-primary" /> Top opportunities</p>
              <span className="text-[10px] text-primary font-semibold">View all →</span>
            </div>
            <ul className="space-y-2.5">
              {[
                { co: "Northwind Co.",  sig: "Hiring 4 RevOps roles · 12 site visits today",   score: 94, color: "from-emerald-400 to-teal-500" },
                { co: "Acme Robotics",  sig: "Series B · $40M · CTO opened deck 3×",            score: 88, color: "from-violet-400 to-purple-500" },
                { co: "Bluebird Labs",  sig: "Switched off Salesforce · evaluating tools",      score: 81, color: "from-amber-400 to-orange-500" },
              ].map((o) => (
                <li key={o.co} className="flex items-center gap-2.5">
                  <div className={`h-8 w-8 shrink-0 rounded-md bg-gradient-to-br ${o.color} flex items-center justify-center text-[10px] font-bold text-white`}>
                    {o.co.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-primary-deep truncate">{o.co}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{o.sig}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-success bg-success/10 px-1.5 py-0.5 rounded">{o.score}</span>
                    <span className="text-[9px] text-muted-foreground mt-0.5">intent</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2 rounded-xl p-4 border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkle />
              <p className="text-xs font-semibold text-primary-deep">AI insight · just now</p>
            </div>
            <p className="text-[11px] leading-relaxed text-primary-deep/90">
              <span className="font-semibold">Northwind Co.</span> shows a 3.4× spike in product page visits.
              Send the <span className="font-semibold">"RevOps benchmarks"</span> sequence — predicted reply rate
              <span className="font-bold text-success"> 41%</span>.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button className="text-[10px] font-semibold bg-primary text-primary-foreground px-2.5 py-1.5 rounded-md hover:opacity-90 transition">
                Launch sequence
              </button>
              <button className="text-[10px] font-semibold text-primary px-2 py-1.5">
                Dismiss
              </button>
            </div>
            <div className="mt-3 pt-3 border-t border-primary/10 flex items-center justify-between text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Saved 9.2h this week</span>
              <span className="font-semibold text-success">+22% pipeline</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Sparkle() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-primary">
      <path d="M12 2l1.8 5.4L19 9l-5.2 1.6L12 16l-1.8-5.4L5 9l5.2-1.6L12 2z" fill="currentColor" />
    </svg>
  );
}
