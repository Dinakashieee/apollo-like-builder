import { useEffect, useState } from "react";
import {
  Globe,
  MessageCircle,
  Brain,
  Swords,
  Target,
  PenLine,
  CheckCircle2,
  TrendingUp,
  Eye,
  MousePointerClick,
  Sparkles,
  Send,
  Building2,
  ArrowUpRight,
  Zap,
  Clock,
} from "lucide-react";

/**
 * AdvancedDashboardsPreview
 * Live, tabbed preview of EngageIQ surfaces shown on the landing page.
 *  - Landing Pages
 *  - WhatsApp
 *  - AI Deal Intelligence
 *  - Competitors
 *  - New Targets
 *  - Email Composer
 */

type TabKey =
  | "landing"
  | "whatsapp"
  | "ai"
  | "competitors"
  | "targets"
  | "composer";

const TABS: { key: TabKey; label: string; icon: typeof Globe; sub: string }[] = [
  { key: "landing",     label: "Landing pages",     icon: Globe,         sub: "Personalized micro-sites per prospect — live views" },
  { key: "whatsapp",    label: "WhatsApp",          icon: MessageCircle, sub: "Connect WhatsApp & reply from one inbox" },
  { key: "ai",          label: "AI deal intel",     icon: Brain,         sub: "Real-time intent scoring & next-best action" },
  { key: "competitors", label: "Competitors",       icon: Swords,        sub: "Who your prospects are evaluating right now" },
  { key: "targets",     label: "New targets",       icon: Target,        sub: "Freshly-matched accounts from your profile" },
  { key: "composer",    label: "Email composer",    icon: PenLine,       sub: "AI drafts grounded in real account signals" },
];

export function AdvancedDashboardsPreview() {
  const [tab, setTab] = useState<TabKey>("landing");

  return (
    <div className="relative card-elevated overflow-hidden border border-border/60 shadow-elevated">
      {/* Window chrome */}
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border/60 bg-muted/30">
        <div className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
        <div className="h-2.5 w-2.5 rounded-full bg-hot/60" />
        <div className="h-2.5 w-2.5 rounded-full bg-success/60" />
        <span className="ml-3 text-[11px] text-muted-foreground font-medium">
          app.engageiq.com / workspace
        </span>
        <span className="ml-auto flex items-center gap-1.5 text-[10px] font-bold bg-success/10 text-success px-2 py-1 rounded-md">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success" />
          </span>
          LIVE
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

        {tab === "landing"     && <LandingPagesPanel />}
        {tab === "whatsapp"    && <WhatsAppPanel />}
        {tab === "ai"          && <AIDealIntelPanel />}
        {tab === "competitors" && <CompetitorsPanel />}
        {tab === "targets"     && <NewTargetsPanel />}
        {tab === "composer"    && <ComposerPanel />}
      </div>
    </div>
  );
}

/* ---------------- helpers ---------------- */

function useTicker(initial: number, step = 1, intervalMs = 1800) {
  const [v, setV] = useState(initial);
  useEffect(() => {
    const id = setInterval(() => setV((x) => x + step), intervalMs);
    return () => clearInterval(id);
  }, [step, intervalMs]);
  return v;
}

function LivePulse() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
    </span>
  );
}

/* ---------------- Landing pages ---------------- */

function LandingPagesPanel() {
  const views = useTicker(1284, 1, 1600);
  const pages = [
    { name: "northwind.engageiq.com/welcome", co: "Northwind Co.",   views: 142, ctr: 38, color: "from-emerald-400 to-teal-500", live: 3 },
    { name: "acme.engageiq.com/intro",        co: "Acme Robotics",   views: 98,  ctr: 31, color: "from-violet-400 to-purple-500", live: 2 },
    { name: "bluebird.engageiq.com/demo",     co: "Bluebird Labs",   views: 76,  ctr: 27, color: "from-amber-400 to-orange-500", live: 1 },
    { name: "lumen.engageiq.com/pricing",     co: "Lumen Health",    views: 54,  ctr: 22, color: "from-pink-400 to-rose-500",    live: 0 },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: "Live visitors now", v: "6",       d: "across 4 pages", icon: Eye },
          { l: "Total views today", v: views.toLocaleString(), d: "+12% vs yest.", icon: TrendingUp },
          { l: "CTA click rate",    v: "29.4%",   d: "industry avg 6%", icon: MousePointerClick },
          { l: "Demos booked",      v: "11",      d: "from landing pages", icon: CheckCircle2 },
        ].map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.l} className="bg-card border border-border/60 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] text-muted-foreground font-medium">{k.l}</p>
                <Icon className="h-3 w-3 text-primary" />
              </div>
              <p className="text-lg sm:text-xl font-display font-bold text-primary-deep tabular-nums">{k.v}</p>
              <p className="text-[10px] text-success font-semibold mt-0.5">{k.d}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-card border border-border/60 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-primary-deep">Personalized landing pages</p>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1.5"><LivePulse /> Updating</span>
        </div>
        <div className="space-y-2.5">
          {pages.map((p) => (
            <div key={p.name} className="flex items-center gap-3">
              <div className={`h-8 w-8 shrink-0 rounded-md bg-gradient-to-br ${p.color} flex items-center justify-center text-[10px] font-bold text-white`}>
                {p.co.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-primary-deep truncate">{p.name}</p>
                <p className="text-[10px] text-muted-foreground tabular-nums">
                  {p.co} · {p.views} views · {p.ctr}% CTR
                </p>
              </div>
              {p.live > 0 ? (
                <span className="flex items-center gap-1.5 text-[10px] font-bold bg-success/10 text-success px-2 py-1 rounded-md">
                  <LivePulse /> {p.live} on page
                </span>
              ) : (
                <span className="text-[10px] text-muted-foreground">idle</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- WhatsApp ---------------- */

function WhatsAppPanel() {
  const msgs = useTicker(347, 1, 2000);
  const threads = [
    { who: "Sarah Chen",   co: "Northwind Co.",  last: "Great — let's do Thursday 2pm 👍", t: "now",   unread: 1, online: true },
    { who: "Marcus Patel", co: "Acme Robotics",  last: "Sending the deck to our CTO now",  t: "2m",    unread: 2, online: true },
    { who: "Jules Romero", co: "Bluebird Labs",  last: "Pricing looks fair, one Q…",        t: "11m",   unread: 0, online: false },
    { who: "Ava Lindgren", co: "Lumen Health",   last: "Yes please send the case study",    t: "1h",    unread: 0, online: false },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: "Connected number", v: "+1 (415) ···", d: "Verified", icon: CheckCircle2 },
          { l: "Messages today",   v: msgs.toString(), d: "+24% vs yest.", icon: Send },
          { l: "Reply rate",       v: "61%",          d: "vs 9% email",   icon: TrendingUp },
          { l: "Avg response",     v: "4m 12s",       d: "−3m vs last wk", icon: Clock },
        ].map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.l} className="bg-card border border-border/60 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] text-muted-foreground font-medium">{k.l}</p>
                <Icon className="h-3 w-3 text-primary" />
              </div>
              <p className="text-base sm:text-lg font-display font-bold text-primary-deep tabular-nums">{k.v}</p>
              <p className="text-[10px] text-success font-semibold mt-0.5">{k.d}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        <div className="lg:col-span-2 bg-card border border-border/60 rounded-xl p-3 space-y-1.5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-primary-deep flex items-center gap-1.5">
              <MessageCircle className="h-3.5 w-3.5 text-success" /> Inbox
            </p>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1.5"><LivePulse /> live</span>
          </div>
          {threads.map((th, i) => (
            <div key={th.who} className={`p-2 rounded-lg flex items-center gap-2 cursor-pointer ${i === 0 ? "bg-primary/5 border border-primary/20" : "hover:bg-muted/40"}`}>
              <div className="relative h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-[10px] font-bold text-white">
                {th.who.split(" ").map(n => n[0]).join("")}
                {th.online && <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-success border-2 border-card" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-[11px] font-bold text-primary-deep truncate">{th.who}</p>
                  <span className="text-[9px] text-muted-foreground shrink-0">{th.t}</span>
                </div>
                <p className="text-[10px] text-muted-foreground truncate">{th.last}</p>
              </div>
              {th.unread > 0 && (
                <span className="h-4 min-w-4 px-1 rounded-full bg-success text-white text-[9px] font-bold flex items-center justify-center">{th.unread}</span>
              )}
            </div>
          ))}
        </div>

        <div className="lg:col-span-3 bg-card border border-border/60 rounded-xl p-4 flex flex-col">
          <div className="flex items-center gap-2 pb-3 border-b border-border/60 mb-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-[10px] font-bold text-white">SC</div>
            <div>
              <p className="text-[11px] font-bold text-primary-deep">Sarah Chen · Northwind Co.</p>
              <p className="text-[9px] text-success flex items-center gap-1"><LivePulse />typing…</p>
            </div>
          </div>
          <div className="space-y-2 flex-1">
            <Bubble side="them">Hey! Saw your note about RevOps benchmarks — interesting.</Bubble>
            <Bubble side="me">Glad it landed 🙌 Want me to walk you through it Thursday?</Bubble>
            <Bubble side="them">Great — let&apos;s do Thursday 2pm 👍</Bubble>
            <Bubble side="me" ai>Auto-draft: "Perfect, sending a calendar invite now."</Bubble>
          </div>
        </div>
      </div>
    </div>
  );
}

function Bubble({ side, children, ai }: { side: "me" | "them"; children: React.ReactNode; ai?: boolean }) {
  const me = side === "me";
  return (
    <div className={`flex ${me ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] px-3 py-1.5 rounded-2xl text-[11px] ${
        me
          ? ai
            ? "bg-primary/10 text-primary-deep border border-dashed border-primary/40"
            : "bg-success text-white"
          : "bg-muted text-primary-deep"
      }`}>
        {ai && <span className="flex items-center gap-1 text-[9px] font-bold text-primary mb-0.5"><Sparkles className="h-2.5 w-2.5" /> AI suggestion</span>}
        {children}
      </div>
    </div>
  );
}

/* ---------------- AI deal intelligence ---------------- */

function AIDealIntelPanel() {
  const deals = [
    { co: "Northwind Co.",  stage: "Demo booked",   score: 94, delta: "+8", next: "Send pricing PDF before Thu call", urgent: true,  color: "from-emerald-400 to-teal-500" },
    { co: "Acme Robotics",  stage: "Evaluating",    score: 88, delta: "+6", next: "Loop in CFO — Series B just closed", urgent: true, color: "from-violet-400 to-purple-500" },
    { co: "Bluebird Labs",  stage: "Champion",      score: 81, delta: "+3", next: "Reply within 4h — pricing question",  urgent: false, color: "from-amber-400 to-orange-500" },
    { co: "Lumen Health",   stage: "Nurture",       score: 64, delta: "−2", next: "Hold — wait for Q1 budget signal",   urgent: false, color: "from-pink-400 to-rose-500" },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: "Pipeline value",  v: "$1.84M",  d: "+$220k this week", icon: TrendingUp },
          { l: "Hot deals",       v: "12",      d: "score ≥ 80",       icon: Zap },
          { l: "AI suggestions",  v: "27",      d: "ready to action",  icon: Sparkles },
          { l: "Forecast accuracy", v: "92%",   d: "last 90 days",     icon: CheckCircle2 },
        ].map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.l} className="bg-card border border-border/60 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] text-muted-foreground font-medium">{k.l}</p>
                <Icon className="h-3 w-3 text-primary" />
              </div>
              <p className="text-lg sm:text-xl font-display font-bold text-primary-deep tabular-nums">{k.v}</p>
              <p className="text-[10px] text-success font-semibold mt-0.5">{k.d}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-card border border-border/60 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-primary-deep flex items-center gap-1.5">
            <Brain className="h-3.5 w-3.5 text-primary" /> Next-best action queue
          </p>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1.5"><LivePulse /> re-scored 2s ago</span>
        </div>
        <div className="space-y-2.5">
          {deals.map((d) => (
            <div key={d.co} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30">
              <div className={`h-9 w-9 shrink-0 rounded-md bg-gradient-to-br ${d.color} flex items-center justify-center text-[10px] font-bold text-white`}>
                {d.co.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[11px] font-bold text-primary-deep truncate">{d.co}</p>
                  <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{d.stage}</span>
                  {d.urgent && <span className="text-[9px] font-bold bg-hot/15 text-hot px-1.5 py-0.5 rounded">ACT NOW</span>}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                  <Sparkles className="h-2.5 w-2.5 text-primary" /> {d.next}
                </p>
              </div>
              <div className="text-right">
                <p className="text-base font-display font-bold text-success leading-none tabular-nums">{d.score}</p>
                <p className="text-[9px] font-semibold text-success">{d.delta}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Competitors ---------------- */

function CompetitorsPanel() {
  const comps = [
    { name: "Outreach.io",   share: 38, trend: "+4",  color: "bg-rose-500",    accounts: ["Acme Robotics", "Lumen Health"] },
    { name: "Apollo.io",     share: 27, trend: "+2",  color: "bg-violet-500",  accounts: ["Bluebird Labs"] },
    { name: "Salesloft",     share: 18, trend: "−1",  color: "bg-amber-500",   accounts: ["Northwind Co."] },
    { name: "Clay",          share: 11, trend: "+6",  color: "bg-emerald-500", accounts: ["Vertex AI Co."] },
    { name: "HubSpot Seq.",  share: 6,  trend: "−3",  color: "bg-sky-500",     accounts: [] },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { l: "Accounts evaluating alternates", v: "47", d: "9 ready to switch", icon: Swords },
          { l: "Won vs competitors (90d)",       v: "31",  d: "68% win rate",      icon: CheckCircle2 },
          { l: "Top displacement target",        v: "Outreach.io", d: "12 deals open", icon: ArrowUpRight },
        ].map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.l} className="bg-card border border-border/60 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] text-muted-foreground font-medium">{k.l}</p>
                <Icon className="h-3 w-3 text-primary" />
              </div>
              <p className="text-base sm:text-lg font-display font-bold text-primary-deep">{k.v}</p>
              <p className="text-[10px] text-success font-semibold mt-0.5">{k.d}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-card border border-border/60 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-primary-deep">Tools your prospects use today</p>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1.5"><LivePulse /> from tech signals</span>
        </div>
        <div className="space-y-2.5">
          {comps.map((c) => (
            <div key={c.name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-primary-deep">{c.name}</span>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {c.share}% share · <span className={c.trend.startsWith("+") ? "text-success font-bold" : "text-destructive font-bold"}>{c.trend}</span>
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted/60 overflow-hidden">
                <div className={`${c.color} h-full transition-all`} style={{ width: `${c.share * 2.2}%` }} />
              </div>
              {c.accounts.length > 0 && (
                <p className="text-[9px] text-muted-foreground mt-1">
                  Open opportunities: {c.accounts.join(" · ")}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- New targets ---------------- */

function NewTargetsPanel() {
  const matched = useTicker(238, 1, 1500);
  const targets = [
    { co: "Vertex AI Co.",     why: "Hiring 4 AEs + RevOps lead",          fit: 96, color: "from-emerald-400 to-teal-500" },
    { co: "Helios Robotics",   why: "Series B closed last week",           fit: 92, color: "from-violet-400 to-purple-500" },
    { co: "Tidewater Health",  why: "Switched off legacy CRM (signal)",    fit: 89, color: "from-amber-400 to-orange-500" },
    { co: "Nimbus Logistics",  why: "Mentioned 'lead quality' on G2 review", fit: 84, color: "from-pink-400 to-rose-500" },
    { co: "Quartz Analytics",  why: "Opened pricing page 3× this week",    fit: 81, color: "from-sky-400 to-blue-500" },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: "New matches today",   v: matched.toString(), d: "from your profile", icon: Target },
          { l: "Avg fit score",       v: "87",               d: "+5 vs last month",  icon: TrendingUp },
          { l: "With buying signal",  v: "62",               d: "act this week",     icon: Zap },
          { l: "Already enriched",    v: "100%",             d: "contacts + email",  icon: CheckCircle2 },
        ].map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.l} className="bg-card border border-border/60 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] text-muted-foreground font-medium">{k.l}</p>
                <Icon className="h-3 w-3 text-primary" />
              </div>
              <p className="text-lg sm:text-xl font-display font-bold text-primary-deep tabular-nums">{k.v}</p>
              <p className="text-[10px] text-success font-semibold mt-0.5">{k.d}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-card border border-border/60 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-primary-deep flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5 text-primary" /> Just matched · ready to reach out
          </p>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1.5"><LivePulse /> streaming</span>
        </div>
        <div className="space-y-2">
          {targets.map((t) => (
            <div key={t.co} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30">
              <div className={`h-9 w-9 shrink-0 rounded-md bg-gradient-to-br ${t.color} flex items-center justify-center text-[10px] font-bold text-white`}>
                {t.co.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-primary-deep flex items-center gap-1.5">
                  <Building2 className="h-3 w-3 text-muted-foreground" /> {t.co}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">{t.why}</p>
              </div>
              <div className="text-right">
                <p className="text-base font-display font-bold text-primary leading-none tabular-nums">{t.fit}</p>
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground">fit</p>
              </div>
              <button className="text-[10px] font-bold bg-primary text-primary-foreground px-2.5 py-1.5 rounded-md hover:bg-primary/90 transition-colors">
                Reach out
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Email composer ---------------- */

function ComposerPanel() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPhase((p) => (p + 1) % 4), 2200);
    return () => clearInterval(id);
  }, []);
  const draftFull = `Hi Farah,

As the CFO of Zenith Manufacturing, you're one of the key decision-makers shaping how the business runs — and we noticed your team is currently using SAP ECC for finance, procurement and inventory.

Out of curiosity, just wondered if your team still spends days on month-end close, struggles with real-time inventory visibility across plants, or wrestles with custom reports every time the board asks a new question.

In the real world no single system covers 100% of a company's needs — so without replacing your SAP core, would it be worth trying BCD ERP alongside it? Our customers typically see a 42% faster close, 28% lower inventory carrying cost, and live dashboards their CFO actually trusts.

Would you be free next week for a no-cost, no-commitment call with our team?

For context, BCD ERP was ranked #1 in Gartner's 2025 Mid-Market ERP Magic Quadrant and is trusted by 1,200+ manufacturers worldwide.

— Alex
BCD ERP`;
  const shown = phase === 0 ? "" : phase === 1 ? draftFull.slice(0, 180) : phase === 2 ? draftFull.slice(0, 520) : draftFull;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: "Personalization", v: "11 signals", d: "used in this draft", icon: Sparkles },
          { l: "Predicted reply", v: "24%",         d: "+3.9× your avg",    icon: TrendingUp },
          { l: "Tone match",      v: "Consultative", d: "matches Farah's LI", icon: CheckCircle2 },
          { l: "Spam score",      v: "0.3 / 10",    d: "inbox safe",        icon: CheckCircle2 },
        ].map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.l} className="bg-card border border-border/60 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] text-muted-foreground font-medium">{k.l}</p>
                <Icon className="h-3 w-3 text-primary" />
              </div>
              <p className="text-base font-display font-bold text-primary-deep">{k.v}</p>
              <p className="text-[10px] text-success font-semibold mt-0.5">{k.d}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        <div className="lg:col-span-3 bg-card border border-border/60 rounded-xl overflow-hidden">
          <div className="px-4 py-2 border-b border-border/60 bg-muted/30 flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">To: farah@zenithmfg.com · Subject: A faster close — without replacing SAP</p>
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-primary">
              <Sparkles className="h-3 w-3 animate-pulse" /> AI drafting
            </span>
          </div>
          <pre className="whitespace-pre-wrap font-sans text-[11px] text-primary-deep p-4 min-h-[260px] leading-relaxed">
{shown}
            <span className="inline-block w-1.5 h-3 bg-primary align-middle animate-pulse ml-0.5" />
          </pre>
          <div className="px-4 py-2 border-t border-border/60 flex items-center justify-between bg-muted/20">
            <div className="flex gap-1.5 flex-wrap">
              <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold">Role: CFO</span>
              <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold">Stack: SAP ECC</span>
              <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold">Pain: month-end close</span>
              <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold">ROI proof</span>
            </div>
            <button className="text-[10px] font-bold bg-primary text-primary-foreground px-3 py-1.5 rounded-md flex items-center gap-1">
              <Send className="h-3 w-3" /> Send
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 bg-card border border-border/60 rounded-xl p-4">
          <p className="text-xs font-semibold text-primary-deep mb-3 flex items-center gap-1.5">
            <Brain className="h-3.5 w-3.5 text-primary" /> Why this draft
          </p>
          <ul className="space-y-2 text-[10.5px] text-primary-deep">
            {[
              "Decision-maker: Farah is CFO at Zenith Manufacturing",
              "Current stack: SAP ECC (finance, procurement, inventory)",
              "Pain points: slow month-end close, low inventory visibility",
              "Positioned as additive — no core replacement risk",
              "ROI quoted: 42% faster close, 28% lower carrying cost",
              "Soft CTA: no-cost, no-commitment 15-min call",
              "Credibility: Gartner 2025 MQ #1, 1,200+ manufacturers",
            ].map((s) => (
              <li key={s} className="flex items-start gap-2">
                <CheckCircle2 className="h-3 w-3 text-success mt-0.5 shrink-0" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
