import { useState } from "react";
import {
  ShieldCheck,
  Clock,
  FlaskConical,
  Building2,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  Mail,
  MousePointerClick,
  Reply,
  Trophy,
} from "lucide-react";

/**
 * AdvancedDashboardsPreview
 * A tabbed showcase of the deeper analytics surfaces that ship with EngageIQ:
 *  - Deliverability
 *  - Best send time heatmap
 *  - Template A/B leaderboard
 *  - Account engagement timeline
 *
 * Pure presentational — designed for the landing page.
 */

type TabKey = "deliverability" | "sendtime" | "templates" | "accounts";

const TABS: { key: TabKey; label: string; icon: typeof ShieldCheck; sub: string }[] = [
  { key: "deliverability", label: "Deliverability", icon: ShieldCheck, sub: "Inbox placement, bounces, complaints" },
  { key: "sendtime",       label: "Send-time heatmap", icon: Clock,    sub: "When your prospects actually open" },
  { key: "templates",      label: "Template A/B",     icon: FlaskConical, sub: "Winning subject lines & copy" },
  { key: "accounts",       label: "Account engagement", icon: Building2, sub: "Multi-thread account intent" },
];

export function AdvancedDashboardsPreview() {
  const [tab, setTab] = useState<TabKey>("deliverability");

  return (
    <div className="relative card-elevated overflow-hidden border border-border/60 shadow-elevated">
      {/* Window chrome */}
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border/60 bg-muted/30">
        <div className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
        <div className="h-2.5 w-2.5 rounded-full bg-hot/60" />
        <div className="h-2.5 w-2.5 rounded-full bg-success/60" />
        <span className="ml-3 text-[11px] text-muted-foreground font-medium">
          app.engageiq.com / analytics
        </span>
        <span className="ml-auto text-[10px] font-bold bg-primary/10 text-primary px-2 py-1 rounded-md">
          ADVANCED
        </span>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-2 px-4 sm:px-6 pt-4 bg-gradient-soft">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`group flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all border ${
                active
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card text-primary-deep border-border/60 hover:border-primary/40"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="p-4 sm:p-6 lg:p-7 bg-gradient-soft">
        <p className="text-[11px] text-muted-foreground mb-4">
          {TABS.find((t) => t.key === tab)?.sub}
        </p>

        {tab === "deliverability" && <DeliverabilityPanel />}
        {tab === "sendtime" && <SendTimePanel />}
        {tab === "templates" && <TemplatesPanel />}
        {tab === "accounts" && <AccountsPanel />}
      </div>
    </div>
  );
}

/* ---------------- Deliverability ---------------- */

function DeliverabilityPanel() {
  const kpis = [
    { label: "Inbox placement", value: "97.4%", delta: "+1.8pt", icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
    { label: "Bounce rate",     value: "0.6%",  delta: "−0.3pt", icon: AlertTriangle, color: "text-warm",    bg: "bg-warm/10" },
    { label: "Spam complaints", value: "0.02%", delta: "−0.01pt",icon: ShieldCheck,   color: "text-primary", bg: "bg-primary/10" },
    { label: "Sender score",    value: "94",    delta: "+3",     icon: TrendingUp,    color: "text-success", bg: "bg-success/10" },
  ];
  const mailboxes = [
    { provider: "Google Workspace", inbox: 98, spam: 1, missing: 1, color: "bg-success" },
    { provider: "Microsoft 365",    inbox: 96, spam: 2, missing: 2, color: "bg-primary" },
    { provider: "Yahoo",            inbox: 94, spam: 4, missing: 2, color: "bg-amber-500" },
    { provider: "Apple iCloud",     inbox: 99, spam: 1, missing: 0, color: "bg-violet-500" },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="bg-card border border-border/60 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] text-muted-foreground font-medium">{k.label}</p>
                <span className={`h-6 w-6 rounded-md ${k.bg} flex items-center justify-center`}>
                  <Icon className={`h-3 w-3 ${k.color}`} />
                </span>
              </div>
              <p className="text-lg sm:text-xl font-display font-bold text-primary-deep tabular-nums">{k.value}</p>
              <p className="text-[10px] font-semibold text-success mt-0.5">{k.delta} vs last 30d</p>
            </div>
          );
        })}
      </div>

      <div className="bg-card border border-border/60 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-primary-deep">Placement by mailbox provider</p>
          <span className="text-[10px] text-muted-foreground">Last 7 days</span>
        </div>
        <div className="space-y-3">
          {mailboxes.map((m) => (
            <div key={m.provider}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium text-primary-deep">{m.provider}</span>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  Inbox {m.inbox}% · Spam {m.spam}% · Missing {m.missing}%
                </span>
              </div>
              <div className="flex h-2 rounded-full overflow-hidden bg-muted/60">
                <div className={`${m.color}`} style={{ width: `${m.inbox}%` }} />
                <div className="bg-destructive/70" style={{ width: `${m.spam}%` }} />
                <div className="bg-muted-foreground/30" style={{ width: `${m.missing}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { l: "SPF", s: "Aligned",     ok: true },
          { l: "DKIM", s: "All keys valid", ok: true },
          { l: "DMARC", s: "p=quarantine", ok: true },
        ].map((r) => (
          <div key={r.l} className="bg-card border border-border/60 rounded-xl p-3 flex items-center gap-3">
            <span className={`h-8 w-8 rounded-md ${r.ok ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"} flex items-center justify-center`}>
              <CheckCircle2 className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[11px] font-bold text-primary-deep">{r.l}</p>
              <p className="text-[10px] text-muted-foreground">{r.s}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Send time heatmap ---------------- */

function SendTimePanel() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const hours = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
  // Deterministic intensity map (0..100) for replies
  const cell = (d: number, h: number) => {
    const peak = (h === 9 || h === 10 || h === 15) ? 30 : 0;
    const base = ((d * 13 + h * 7) % 55) + 10;
    return Math.min(100, base + peak + (d === 1 || d === 2 ? 10 : 0));
  };
  const intensity = (v: number) => {
    if (v >= 80) return "bg-primary text-primary-foreground";
    if (v >= 60) return "bg-primary/70 text-primary-foreground";
    if (v >= 40) return "bg-primary/40 text-primary-deep";
    if (v >= 20) return "bg-primary/20 text-primary-deep";
    return "bg-primary/5 text-muted-foreground";
  };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: "Best window",      v: "Tue 9-10a",  d: "+38% reply rate", icon: Clock },
          { l: "Worst window",     v: "Fri 4-5p",   d: "−52% reply rate", icon: TrendingDown },
          { l: "Avg time-to-open", v: "1h 12m",     d: "−18m vs last wk", icon: Mail },
          { l: "Avg time-to-reply",v: "3h 41m",     d: "−42m vs last wk", icon: Reply },
        ].map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.l} className="bg-card border border-border/60 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] text-muted-foreground font-medium">{k.l}</p>
                <Icon className="h-3 w-3 text-primary" />
              </div>
              <p className="text-lg font-display font-bold text-primary-deep">{k.v}</p>
              <p className="text-[10px] text-success font-semibold mt-0.5">{k.d}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-card border border-border/60 rounded-xl p-4 overflow-x-auto">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-primary-deep">Reply rate by send hour (prospect local time)</p>
          <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
            <span className="h-2 w-2 rounded-sm bg-primary/10" />
            <span className="h-2 w-2 rounded-sm bg-primary/40" />
            <span className="h-2 w-2 rounded-sm bg-primary/70" />
            <span className="h-2 w-2 rounded-sm bg-primary" />
            <span className="ml-1">low → high</span>
          </div>
        </div>
        <div className="inline-grid gap-1" style={{ gridTemplateColumns: `48px repeat(${hours.length}, minmax(28px, 1fr))` }}>
          <div />
          {hours.map((h) => (
            <div key={h} className="text-[9px] text-muted-foreground text-center tabular-nums">{h}{h < 12 ? "a" : "p"}</div>
          ))}
          {days.map((d, di) => (
            <FragmentRow key={d}>
              <div className="text-[10px] font-semibold text-primary-deep flex items-center">{d}</div>
              {hours.map((h) => {
                const v = cell(di, h);
                return (
                  <div
                    key={`${d}-${h}`}
                    className={`h-7 rounded-md flex items-center justify-center text-[9px] font-bold transition-transform hover:scale-110 ${intensity(v)}`}
                    title={`${d} ${h}:00 · ${v}% reply intensity`}
                  >
                    {v >= 60 ? v : ""}
                  </div>
                );
              })}
            </FragmentRow>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Template A/B leaderboard ---------------- */

function TemplatesPanel() {
  const templates = [
    { name: "RevOps benchmarks · v3",    sent: 412, open: 71, reply: 18.4, win: true, color: "from-emerald-400 to-teal-500" },
    { name: "Hiring signal · short",     sent: 298, open: 64, reply: 14.1, win: false, color: "from-primary to-primary-glow" },
    { name: "Series B congrats",         sent: 256, open: 68, reply: 12.7, win: false, color: "from-amber-400 to-orange-500" },
    { name: "Switched off Salesforce",   sent: 184, open: 59, reply: 11.2, win: false, color: "from-violet-400 to-purple-500" },
    { name: "Product page revisit",      sent: 142, open: 52, reply: 8.6,  win: false, color: "from-pink-400 to-rose-500" },
  ];
  const maxReply = Math.max(...templates.map((t) => t.reply));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 bg-card border border-border/60 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-primary-deep flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5 text-primary" /> Template leaderboard
            </p>
            <span className="text-[10px] text-muted-foreground">Sorted by reply rate</span>
          </div>
          <div className="space-y-2.5">
            {templates.map((t) => (
              <div key={t.name} className="flex items-center gap-3">
                <div className={`h-8 w-8 shrink-0 rounded-md bg-gradient-to-br ${t.color} flex items-center justify-center text-[10px] font-bold text-white`}>
                  {t.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold text-primary-deep truncate">{t.name}</p>
                    {t.win && (
                      <span className="text-[9px] font-bold bg-success/15 text-success px-1.5 py-0.5 rounded shrink-0">WINNING</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-muted/60 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-primary-glow rounded-full transition-all"
                        style={{ width: `${(t.reply / maxReply) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-primary-deep tabular-nums w-12 text-right">{t.reply}%</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-0.5 tabular-nums">
                    {t.sent} sent · {t.open}% opened
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border/60 rounded-xl p-4 flex flex-col">
          <p className="text-xs font-semibold text-primary-deep mb-3 flex items-center gap-1.5">
            <FlaskConical className="h-3.5 w-3.5 text-primary" /> Active A/B test
          </p>
          <div className="space-y-3 flex-1">
            <ABRow label="A" subject={`"Quick RevOps idea?"`} reply={11.8} winning={false} />
            <ABRow label="B" subject={`"3 RevOps benchmarks"`} reply={18.4} winning={true} />
          </div>
          <div className="mt-3 p-2 rounded-md bg-primary/5 border border-primary/15">
            <p className="text-[10px] text-primary-deep">
              <span className="font-bold">Variant B</span> is winning with 97% confidence. Auto-promote in 6 hours.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ABRow({ label, subject, reply, winning }: { label: string; subject: string; reply: number; winning: boolean }) {
  return (
    <div className={`p-2.5 rounded-lg border ${winning ? "border-success/40 bg-success/5" : "border-border/60 bg-muted/30"}`}>
      <div className="flex items-center justify-between mb-1">
        <span className={`h-5 w-5 rounded-md flex items-center justify-center text-[10px] font-bold ${winning ? "bg-success text-white" : "bg-muted text-primary-deep"}`}>
          {label}
        </span>
        <span className={`text-[10px] font-bold tabular-nums ${winning ? "text-success" : "text-muted-foreground"}`}>{reply}% reply</span>
      </div>
      <p className="text-[11px] text-primary-deep truncate">{subject}</p>
    </div>
  );
}

/* ---------------- Account engagement ---------------- */

function AccountsPanel() {
  const accounts = [
    {
      co: "Northwind Co.",
      score: 94,
      color: "from-emerald-400 to-teal-500",
      trail: [
        { who: "CEO",  open: 4, click: 2, reply: 1 },
        { who: "VP RevOps", open: 6, click: 3, reply: 0 },
        { who: "Director Sales Ops", open: 3, click: 1, reply: 0 },
      ],
      sig: "12 site visits today · pricing page 3×",
    },
    {
      co: "Acme Robotics",
      score: 88,
      color: "from-violet-400 to-purple-500",
      trail: [
        { who: "CTO", open: 7, click: 4, reply: 1 },
        { who: "Head of Eng", open: 2, click: 1, reply: 0 },
      ],
      sig: "Deck opened 3× by CTO · Series B closed",
    },
    {
      co: "Bluebird Labs",
      score: 81,
      color: "from-amber-400 to-orange-500",
      trail: [
        { who: "Founder", open: 5, click: 2, reply: 1 },
        { who: "Ops Lead", open: 3, click: 0, reply: 0 },
      ],
      sig: "Switched off Salesforce · evaluating",
    },
  ];
  return (
    <div className="space-y-3">
      {accounts.map((a) => (
        <div key={a.co} className="bg-card border border-border/60 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${a.color} flex items-center justify-center text-[11px] font-bold text-white`}>
              {a.co.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-primary-deep">{a.co}</p>
              <p className="text-[10px] text-muted-foreground truncate">{a.sig}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-display font-bold text-success leading-none">{a.score}</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">intent</p>
            </div>
          </div>
          <div className="space-y-2">
            {a.trail.map((p) => (
              <div key={p.who} className="grid grid-cols-12 gap-2 items-center">
                <span className="col-span-3 text-[10px] font-semibold text-primary-deep truncate">{p.who}</span>
                <PersonBar icon={Mail} value={p.open} max={8} color="bg-primary/70" />
                <PersonBar icon={MousePointerClick} value={p.click} max={5} color="bg-amber-500" />
                <PersonBar icon={Reply} value={p.reply} max={2} color="bg-success" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PersonBar({ icon: Icon, value, max, color }: { icon: typeof Mail; value: number; max: number; color: string }) {
  return (
    <div className="col-span-3 flex items-center gap-1.5">
      <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
      <div className="flex-1 h-1.5 bg-muted/60 rounded-full overflow-hidden">
        <div className={`${color} h-full rounded-full transition-all`} style={{ width: `${(value / max) * 100}%` }} />
      </div>
      <span className="text-[9px] font-bold text-primary-deep tabular-nums w-3 text-right">{value}</span>
    </div>
  );
}
