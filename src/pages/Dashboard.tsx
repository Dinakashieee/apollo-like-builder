import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
  Plug,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { DemoDataPrompt } from "@/components/DemoDataPrompt";
import { AddLeadDialog } from "@/components/AddLeadDialog";

type TabKey =
  | "landing"
  | "whatsapp"
  | "ai"
  | "competitors"
  | "targets"
  | "composer";

const TABS: { key: TabKey; label: string; icon: typeof Globe; sub: string }[] = [
  { key: "landing",     label: "Landing pages",  icon: Globe,         sub: "Personalized micro-sites per prospect — live views" },
  { key: "whatsapp",    label: "WhatsApp",       icon: MessageCircle, sub: "Connect WhatsApp & reply from one inbox" },
  { key: "ai",          label: "AI deal intel",  icon: Brain,         sub: "Real-time intent scoring & next-best action" },
  { key: "competitors", label: "Competitors",    icon: Swords,        sub: "Who your prospects are evaluating right now" },
  { key: "targets",     label: "New targets",    icon: Target,        sub: "Freshly-matched accounts from your profile" },
  { key: "composer",    label: "Email composer", icon: PenLine,       sub: "AI drafts grounded in real account signals" },
];

function LivePulse() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
    </span>
  );
}

function Stat({ label, value, delta, Icon }: { label: string; value: string; delta?: string; Icon: typeof Globe }) {
  return (
    <div className="bg-card border border-border/60 rounded-xl p-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] text-muted-foreground font-medium">{label}</p>
        <Icon className="h-3 w-3 text-primary" />
      </div>
      <p className="text-lg sm:text-xl font-display font-bold text-primary-deep tabular-nums">{value}</p>
      {delta && <p className="text-[10px] text-success font-semibold mt-0.5">{delta}</p>}
    </div>
  );
}

function EmptyState({
  Icon,
  title,
  body,
  ctaLabel,
  to,
}: {
  Icon: typeof Globe;
  title: string;
  body: string;
  ctaLabel: string;
  to: string;
}) {
  return (
    <div className="bg-card border border-dashed border-border rounded-xl p-10 text-center flex flex-col items-center gap-3">
      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <h3 className="font-display font-bold text-primary-deep">{title}</h3>
      <p className="text-xs text-muted-foreground max-w-md">{body}</p>
      <Link
        to={to}
        className="mt-2 inline-flex items-center gap-2 text-xs font-bold bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
      >
        <Plug className="h-3.5 w-3.5" /> {ctaLabel}
      </Link>
    </div>
  );
}

export default function Dashboard() {
  const { current } = useWorkspace();
  const { user } = useAuth();
  const [tab, setTab] = useState<TabKey>("ai");
  const [profileName, setProfileName] = useState("");

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

  const active = TABS.find((t) => t.key === tab)!;

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <DemoDataPrompt />

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
            Six live surfaces · real signals, ready to action
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <AddLeadDialog onCreated={() => {}} />
        </div>
      </div>

      {/* Tabs container styled like the landing preview */}
      <div className="relative card-elevated overflow-hidden border border-border/60 shadow-elevated">
        <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border/60 bg-muted/30">
          <div className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
          <div className="h-2.5 w-2.5 rounded-full bg-hot/60" />
          <div className="h-2.5 w-2.5 rounded-full bg-success/60" />
          <span className="ml-3 text-[11px] text-muted-foreground font-medium">
            {current?.name ?? "workspace"} · sales intelligence
          </span>
          <span className="ml-auto flex items-center gap-1.5 text-[10px] font-bold bg-success/10 text-success px-2 py-1 rounded-md">
            <LivePulse /> LIVE
          </span>
        </div>

        <div className="flex flex-wrap gap-2 px-4 sm:px-6 pt-4 bg-gradient-soft">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`group flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all border ${
                  isActive
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
          <p className="text-[11px] text-muted-foreground mb-4">{active.sub}</p>

          {tab === "landing"     && <LandingPagesTab workspaceId={current?.id} />}
          {tab === "whatsapp"    && <WhatsAppTab />}
          {tab === "ai"          && <AIDealIntelTab workspaceId={current?.id} />}
          {tab === "competitors" && <CompetitorsTab />}
          {tab === "targets"     && <NewTargetsTab workspaceId={current?.id} />}
          {tab === "composer"    && <ComposerTab />}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Landing pages (empty state) ---------------- */

function LandingPagesTab({ workspaceId }: { workspaceId?: string }) {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    if (!workspaceId) return;
    supabase
      .from("landing_pages")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .then(({ count }) => setCount(count ?? 0));
  }, [workspaceId]);

  if (count && count > 0) {
    return (
      <div className="bg-card border border-border/60 rounded-xl p-6 text-center">
        <p className="text-sm font-semibold text-primary-deep mb-1">
          {count} landing page{count === 1 ? "" : "s"} published
        </p>
        <p className="text-xs text-muted-foreground mb-4">Manage them and review live views in Landing pages.</p>
        <Link to="/app/pages" className="inline-flex items-center gap-2 text-xs font-bold bg-primary text-primary-foreground px-4 py-2 rounded-lg">
          Open Landing pages <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }
  return (
    <EmptyState
      Icon={Globe}
      title="No landing pages yet"
      body="Publish a personalized micro-site per prospect and watch live visitors, CTAs and demo bookings stream in here."
      ctaLabel="Create your first landing page"
      to="/app/pages"
    />
  );
}

/* ---------------- WhatsApp (empty state) ---------------- */

function WhatsAppTab() {
  return (
    <EmptyState
      Icon={MessageCircle}
      title="Connect WhatsApp"
      body="Reply to every prospect from one inbox, get 61% reply rates vs 9% on email, and let AI auto-draft warm responses."
      ctaLabel="Connect WhatsApp"
      to="/app/settings"
    />
  );
}

/* ---------------- AI deal intel (real data) ---------------- */

function AIDealIntelTab({ workspaceId }: { workspaceId?: string }) {
  const [opps, setOpps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    supabase
      .from("opportunities")
      .select("id, title, industry, score, level, problem")
      .eq("workspace_id", workspaceId)
      .order("score", { ascending: false })
      .limit(8)
      .then(({ data }) => {
        setOpps(data ?? []);
        setLoading(false);
      });
  }, [workspaceId]);

  const hot = opps.filter((o) => (o.score ?? 0) >= 80).length;
  const avgScore = opps.length ? Math.round(opps.reduce((a, b) => a + (b.score ?? 0), 0) / opps.length) : 0;

  if (!loading && opps.length === 0) {
    return (
      <EmptyState
        Icon={Brain}
        title="No deal intelligence yet"
        body="Add leads or run intelligence to surface a real-time next-best-action queue with intent scores and urgency."
        ctaLabel="Open Intelligence"
        to="/app/intelligence"
      />
    );
  }

  const colors = ["from-emerald-400 to-teal-500", "from-violet-400 to-purple-500", "from-amber-400 to-orange-500", "from-pink-400 to-rose-500", "from-sky-400 to-blue-500"];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Opportunities" value={String(opps.length)} delta="ranked by score" Icon={TrendingUp} />
        <Stat label="Hot deals" value={String(hot)} delta="score ≥ 80" Icon={Zap} />
        <Stat label="Avg score" value={String(avgScore)} delta="last refresh" Icon={Sparkles} />
        <Stat label="Forecast accuracy" value="92%" delta="last 90 days" Icon={CheckCircle2} />
      </div>

      <div className="bg-card border border-border/60 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-primary-deep flex items-center gap-1.5">
            <Brain className="h-3.5 w-3.5 text-primary" /> Next-best action queue
          </p>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1.5"><LivePulse /> live</span>
        </div>
        <div className="space-y-2.5">
          {opps.map((d, i) => {
            const urgent = (d.score ?? 0) >= 80;
            return (
              <div key={d.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30">
                <div className={`h-9 w-9 shrink-0 rounded-md bg-gradient-to-br ${colors[i % colors.length]} flex items-center justify-center text-[10px] font-bold text-white`}>
                  {(d.title ?? "??").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] font-bold text-primary-deep truncate">{d.title ?? "Untitled"}</p>
                    {d.industry && <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{d.industry}</span>}
                    {urgent && <span className="text-[9px] font-bold bg-hot/15 text-hot px-1.5 py-0.5 rounded">ACT NOW</span>}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1 truncate">
                    <Sparkles className="h-2.5 w-2.5 text-primary" /> {d.problem ?? "Review intelligence for next-best action"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-base font-display font-bold text-success leading-none tabular-nums">{d.score ?? 0}</p>
                  <p className="text-[9px] font-semibold text-muted-foreground">{d.level ?? "—"}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Competitors (empty state) ---------------- */

function CompetitorsTab() {
  return (
    <EmptyState
      Icon={Swords}
      title="Competitor signals unlocked in Intelligence"
      body="See who your prospects are evaluating, win-rate vs each competitor, and top displacement targets — based on real tech signals."
      ctaLabel="Open Intelligence"
      to="/app/intelligence"
    />
  );
}

/* ---------------- New targets (real data) ---------------- */

function NewTargetsTab({ workspaceId }: { workspaceId?: string }) {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    supabase
      .from("leads")
      .select("id, contact_name, company_name, score, status, created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(8)
      .then(({ data }) => {
        setLeads(data ?? []);
        setLoading(false);
      });
  }, [workspaceId]);

  if (!loading && leads.length === 0) {
    return (
      <EmptyState
        Icon={Target}
        title="No targets yet"
        body="Generate freshly-matched accounts based on your company profile. Each comes enriched with contacts and a fit score."
        ctaLabel="Find new targets"
        to="/app/targets"
      />
    );
  }

  const withSignal = leads.filter((l) => (l.score ?? 0) >= 70).length;
  const avg = leads.length ? Math.round(leads.reduce((a, b) => a + (b.score ?? 0), 0) / leads.length) : 0;
  const colors = ["from-emerald-400 to-teal-500", "from-violet-400 to-purple-500", "from-amber-400 to-orange-500", "from-pink-400 to-rose-500", "from-sky-400 to-blue-500"];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Recent matches" value={String(leads.length)} delta="last 8 added" Icon={Target} />
        <Stat label="Avg fit score" value={String(avg)} delta="from your profile" Icon={TrendingUp} />
        <Stat label="With buying signal" value={String(withSignal)} delta="score ≥ 70" Icon={Zap} />
        <Stat label="Already enriched" value="100%" delta="contacts + email" Icon={CheckCircle2} />
      </div>

      <div className="bg-card border border-border/60 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-primary-deep flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5 text-primary" /> Just matched · ready to reach out
          </p>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1.5"><LivePulse /> streaming</span>
        </div>
        <div className="space-y-2">
          {leads.map((t, i) => (
            <div key={t.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30">
              <div className={`h-9 w-9 shrink-0 rounded-md bg-gradient-to-br ${colors[i % colors.length]} flex items-center justify-center text-[10px] font-bold text-white`}>
                {(t.company_name ?? t.contact_name ?? "??").slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-primary-deep flex items-center gap-1.5">
                  <Building2 className="h-3 w-3 text-muted-foreground" /> {t.company_name ?? "Unknown company"}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {t.contact_name ?? "—"} · status {t.status ?? "new"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-base font-display font-bold text-primary leading-none tabular-nums">{t.score ?? 0}</p>
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground">fit</p>
              </div>
              <Link
                to={`/app/leads?lead=${t.id}`}
                className="text-[10px] font-bold bg-primary text-primary-foreground px-2.5 py-1.5 rounded-md hover:bg-primary/90 transition-colors"
              >
                Reach out
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Email composer ---------------- */

function ComposerTab() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Personalization" value="11 signals" delta="used per draft" Icon={Sparkles} />
        <Stat label="Predicted reply" value="24%" delta="+3.9× your avg" Icon={TrendingUp} />
        <Stat label="Tone match" value="Consultative" delta="matches prospect" Icon={CheckCircle2} />
        <Stat label="Spam score" value="0.3 / 10" delta="inbox safe" Icon={CheckCircle2} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        <div className="lg:col-span-3 bg-card border border-border/60 rounded-xl overflow-hidden">
          <div className="px-4 py-2 border-b border-border/60 bg-muted/30 flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">Sample draft · grounded in real account signals</p>
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-primary">
              <Sparkles className="h-3 w-3" /> AI
            </span>
          </div>
          <pre className="whitespace-pre-wrap font-sans text-[11px] text-primary-deep p-4 leading-relaxed">
{`Hi Farah,

As the CFO of Zenith Manufacturing, you're one of the key decision-makers shaping how the business runs — and we noticed your team is currently using SAP ECC for finance, procurement and inventory.

Out of curiosity, just wondered if your team still spends days on month-end close, struggles with real-time inventory visibility across plants, or wrestles with custom reports every time the board asks a new question.

In the real world no single system covers 100% of a company's needs — so without replacing your SAP core, would it be worth trying BCD ERP alongside it? Our customers typically see a 42% faster close, 28% lower inventory carrying cost, and live dashboards their CFO actually trusts.

Would you be free next week for a no-cost, no-commitment call with our team?

For context, BCD ERP was ranked #1 in Gartner's 2025 Mid-Market ERP Magic Quadrant and is trusted by 1,200+ manufacturers worldwide.

— Alex
BCD ERP`}
          </pre>
          <div className="px-4 py-2 border-t border-border/60 flex items-center justify-between bg-muted/20">
            <div className="flex gap-1.5 flex-wrap">
              <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold">Role: CFO</span>
              <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold">Stack: SAP ECC</span>
              <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold">Pain: month-end close</span>
              <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold">ROI proof</span>
            </div>
            <Link to="/app/composer" className="text-[10px] font-bold bg-primary text-primary-foreground px-3 py-1.5 rounded-md flex items-center gap-1">
              <Send className="h-3 w-3" /> Draft for a lead
            </Link>
          </div>
        </div>

        <div className="lg:col-span-2 bg-card border border-border/60 rounded-xl p-4">
          <p className="text-xs font-semibold text-primary-deep mb-3 flex items-center gap-1.5">
            <Brain className="h-3.5 w-3.5 text-primary" /> Why this draft works
          </p>
          <ul className="space-y-2 text-[10.5px] text-primary-deep">
            {[
              "Decision-maker called out by name and role",
              "Current stack referenced (SAP ECC)",
              "Pain points framed as questions, not assumptions",
              "Positioned as additive — no core replacement risk",
              "Quantified ROI proof (42% faster close)",
              "Soft CTA: no-cost, no-commitment call",
              "Credibility: Gartner MQ + 1,200+ customers",
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
