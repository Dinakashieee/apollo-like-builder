import { useEffect, useState } from "react";
import { Sparkles, RefreshCw, Target, Building2, AlertTriangle, TrendingUp, Compass, Clock, FileText, Linkedin, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface Opportunity {
  id: string;
  title: string;
  problem: string | null;
  industry: string | null;
  score: number | null;
  level: "high" | "medium" | "low" | null;
  rationale: string | null;
}

interface PainPoint {
  pain_point: string;
  who_feels_it: string;
  severity: "critical" | "high" | "medium";
  evidence: string;
}
interface FocusRec {
  focus: string;
  why: string;
  expected_impact: "high" | "medium" | "low";
  product_to_lead_with: string;
}
interface Trend {
  trend: string;
  direction: "rising" | "shifting" | "declining";
  implication_for_seller: string;
  time_horizon: string;
}

const LEVEL_BADGES = {
  high: { label: "🔥 High", color: "bg-hot/15 text-hot border-hot/30" },
  medium: { label: "⚠️ Medium", color: "bg-warm/15 text-warm border-warm/30" },
  low: { label: "❄️ Low", color: "bg-cold/15 text-cold border-cold/30" },
};

const SEVERITY_COLOR: Record<string, string> = {
  critical: "bg-hot/15 text-hot border-hot/30",
  high: "bg-warm/15 text-warm border-warm/30",
  medium: "bg-cold/15 text-cold border-cold/30",
};
const IMPACT_COLOR: Record<string, string> = {
  high: "bg-hot/15 text-hot border-hot/30",
  medium: "bg-warm/15 text-warm border-warm/30",
  low: "bg-cold/15 text-cold border-cold/30",
};
const DIRECTION_COLOR: Record<string, string> = {
  rising: "bg-hot/15 text-hot border-hot/30",
  shifting: "bg-warm/15 text-warm border-warm/30",
  declining: "bg-muted text-muted-foreground border-border",
};

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

export default function Intelligence() {
  const { current } = useWorkspace();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [painPoints, setPainPoints] = useState<PainPoint[]>([]);
  const [focusRecs, setFocusRecs] = useState<FocusRec[]>([]);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [trendsRefreshedAt, setTrendsRefreshedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [hasCompany, setHasCompany] = useState(false);

  const load = async () => {
    if (!current) return;
    setLoading(true);
    const [{ data: opps }, { data: company }, { data: mi }] = await Promise.all([
      supabase.from("opportunities").select("*").eq("workspace_id", current.id).order("score", { ascending: false }),
      supabase.from("company_profiles").select("id").eq("workspace_id", current.id).maybeSingle(),
      supabase.from("market_intelligence" as any).select("*").eq("workspace_id", current.id).maybeSingle(),
    ]);
    setOpportunities((opps ?? []) as Opportunity[]);
    setHasCompany(!!company);
    const m = mi as any;
    setPainPoints((m?.market_pain_points ?? []) as PainPoint[]);
    setFocusRecs((m?.focus_recommendations ?? []) as FocusRec[]);
    setTrends((m?.market_trends ?? []) as Trend[]);
    setTrendsRefreshedAt(m?.trends_refreshed_at ?? null);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  const generate = async (auto = false) => {
    if (!current) return;
    if (!hasCompany) {
      toast({
        title: "Add your company first",
        description: "Go to Company in the sidebar to add your profile.",
        variant: "destructive",
      });
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-opportunities", {
        body: { workspace_id: current.id, mode: auto ? "auto" : "manual" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!auto) {
        toast({
          title: "Market brief refreshed",
          description: `${data?.count ?? 0} opportunities, ${data?.market_pain_points?.length ?? 0} pain points, ${data?.market_trends?.length ?? 0} trends.`,
        });
      }
      await load();
    } catch (e: any) {
      if (!auto) {
        toast({
          title: "Generation failed",
          description: e?.message ?? "Try again later.",
          variant: "destructive",
        });
      }
    }
    setGenerating(false);
  };

  // Auto-refresh trends every 3 months
  useEffect(() => {
    if (loading || !hasCompany || generating) return;
    const stale =
      !trendsRefreshedAt ||
      Date.now() - new Date(trendsRefreshedAt).getTime() > NINETY_DAYS_MS;
    if (stale && (painPoints.length > 0 || trends.length > 0)) {
      // Background refresh; don't toast
      generate(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, hasCompany, trendsRefreshedAt]);

  const trendsAgeLabel = trendsRefreshedAt
    ? (() => {
        const days = Math.floor((Date.now() - new Date(trendsRefreshedAt).getTime()) / (24 * 60 * 60 * 1000));
        if (days === 0) return "Updated today";
        if (days === 1) return "Updated 1 day ago";
        return `Updated ${days} days ago`;
      })()
    : null;

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm text-primary font-medium mb-1 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Powered by EngageIQ AI
          </p>
          <h1 className="text-3xl lg:text-4xl font-display font-bold text-primary-deep">
            AI Deal Intelligence
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Based on your company profile and product catalog: market pain points buyers feel right now,
            where to focus, current trends (auto-refreshed every 3 months) and grounded deal opportunities.
          </p>
        </div>
        <Button onClick={() => generate(false)} disabled={generating} className="bg-gradient-primary shadow-glow">
          {generating ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
          {generating ? "Generating..." : "Refresh brief"}
        </Button>
      </div>

      {!hasCompany && (
        <div className="card-elevated p-6 border-warm/40 bg-warm/5">
          <div className="flex gap-3">
            <Building2 className="h-5 w-5 text-warm shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-primary-deep">Add your company first</p>
              <p className="text-sm text-muted-foreground">
                Upload your company profile and products so the AI can target your exact market.
              </p>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </div>
      )}

      {!loading && hasCompany && painPoints.length === 0 && opportunities.length === 0 && (
        <div className="card-elevated p-12 text-center">
          <Target className="h-10 w-10 text-primary mx-auto mb-3" />
          <p className="font-semibold text-primary-deep">No brief yet</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Click "Refresh brief" to generate pain points, focus areas, trends and opportunities.
          </p>
        </div>
      )}

      {/* Market pain points */}
      {painPoints.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-hot" />
            <h2 className="text-xl font-display font-bold text-primary-deep">Market pain points</h2>
            <span className="text-xs text-muted-foreground">What your buyers are dealing with now</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {painPoints.map((p, i) => (
              <div key={i} className="card-elevated p-5">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-primary-deep leading-tight">{p.pain_point}</h3>
                  <span className={`text-[10px] font-bold border px-2 py-1 rounded-md whitespace-nowrap uppercase ${SEVERITY_COLOR[p.severity] ?? ""}`}>
                    {p.severity}
                  </span>
                </div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                  Felt by: {p.who_feels_it}
                </p>
                <p className="text-sm text-foreground/85 leading-relaxed">{p.evidence}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Focus recommendations */}
      {focusRecs.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-display font-bold text-primary-deep">Where to focus</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {focusRecs.map((f, i) => (
              <div key={i} className="card-elevated p-5">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-primary-deep leading-tight">{f.focus}</h3>
                  <span className={`text-[10px] font-bold border px-2 py-1 rounded-md whitespace-nowrap uppercase ${IMPACT_COLOR[f.expected_impact] ?? ""}`}>
                    {f.expected_impact} impact
                  </span>
                </div>
                <p className="text-sm text-foreground/85 mb-2 leading-relaxed">{f.why}</p>
                <p className="text-xs text-muted-foreground">
                  Lead with: <span className="font-semibold text-primary">{f.product_to_lead_with}</span>
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Market trends */}
      {trends.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-display font-bold text-primary-deep">Market trends</h2>
            {trendsAgeLabel && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> {trendsAgeLabel} · auto-refreshes every 3 months
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {trends.map((t, i) => (
              <div key={i} className="card-elevated p-5">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-primary-deep leading-tight">{t.trend}</h3>
                  <span className={`text-[10px] font-bold border px-2 py-1 rounded-md whitespace-nowrap uppercase ${DIRECTION_COLOR[t.direction] ?? ""}`}>
                    {t.direction}
                  </span>
                </div>
                <p className="text-sm text-foreground/85 mb-2 leading-relaxed">{t.implication_for_seller}</p>
                <p className="text-xs text-muted-foreground">Horizon: {t.time_horizon}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Opportunities */}
      {opportunities.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-display font-bold text-primary-deep">Deal opportunities</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {opportunities.map((o) => {
              const level = (o.level ?? "medium") as keyof typeof LEVEL_BADGES;
              const badge = LEVEL_BADGES[level];
              return (
                <div key={o.id} className="card-elevated p-6">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="font-display font-bold text-primary-deep text-lg leading-tight">
                      {o.title}
                    </h3>
                    <span className={`text-[10px] font-bold border px-2 py-1 rounded-md whitespace-nowrap ${badge.color}`}>
                      {badge.label}
                    </span>
                  </div>
                  {o.industry && (
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                      {o.industry}
                    </p>
                  )}
                  {o.problem && <p className="text-sm text-foreground/85 mb-3 leading-relaxed">{o.problem}</p>}
                  {o.rationale && (
                    <div className="border-t border-border/60 pt-3 text-xs text-muted-foreground">
                      <p className="font-semibold text-primary-deep mb-1">Why it matters</p>
                      <p>{o.rationale}</p>
                    </div>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">Opportunity score</span>
                    <span className="text-sm font-bold text-primary">{o.score ?? 0}/100</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
