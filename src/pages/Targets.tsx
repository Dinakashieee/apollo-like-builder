import { useEffect, useState } from "react";
import { Sparkles, Target, RefreshCw, Building2, ExternalLink, Users, Crosshair, CheckCircle2, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface RefLink {
  label: string;
  url: string;
}

interface SimilarProduct {
  name: string;
  category: string;
  strengths: string[];
  weaknesses: string[];
  audience: string;
  your_advantage: string;
  references?: RefLink[];
}

interface TargetCompany {
  // new shape
  company?: string;
  website?: string;
  size?: string;
  designations?: string[];
  focus_areas?: string[];
  references?: RefLink[];
  // legacy shape (kept for backward compat with cached data)
  type?: string;
  industry: string;
  problem: string;
  why: string;
  level: "high" | "medium" | "low";
}

const LEVEL_BADGES = {
  high: { label: "🔥 High", color: "bg-hot/15 text-hot border-hot/30" },
  medium: { label: "⚠️ Medium", color: "bg-warm/15 text-warm border-warm/30" },
  low: { label: "❄️ Low", color: "bg-cold/15 text-cold border-cold/30" },
};

export default function Targets() {
  const { current } = useWorkspace();
  const [similar, setSimilar] = useState<SimilarProduct[]>([]);
  const [targets, setTargets] = useState<TargetCompany[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasCompany, setHasCompany] = useState(false);

  useEffect(() => {
    if (!current) return;
    supabase
      .from("company_profiles")
      .select("id")
      .eq("workspace_id", current.id)
      .maybeSingle()
      .then(({ data }) => setHasCompany(!!data));
    const cached = localStorage.getItem(`targets-${current.id}`);
    if (cached) {
      try {
        const j = JSON.parse(cached);
        setSimilar(j.similar ?? []);
        setTargets(j.targets ?? []);
      } catch {}
    }
  }, [current]);

  const generate = async () => {
    if (!current) return;
    if (!hasCompany) {
      toast({
        title: "Add your company first",
        description: "Go to Company to add your profile.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-targets", {
        body: { workspace_id: current.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSimilar(data.similar ?? []);
      setTargets(data.targets ?? []);
      localStorage.setItem(
        `targets-${current.id}`,
        JSON.stringify({ similar: data.similar, targets: data.targets })
      );
      toast({ title: "Insights generated" });
    } catch (e: any) {
      toast({ title: "Failed", description: e?.message ?? "Try again", variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm text-primary font-medium mb-1 flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5" /> Market intelligence
          </p>
          <h1 className="text-3xl lg:text-4xl font-display font-bold text-primary-deep">
            Targets & Competitors
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            See similar products, your advantage, and the best companies to sell to.
          </p>
        </div>
        <Button onClick={generate} disabled={loading} className="bg-gradient-primary shadow-glow">
          {loading ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          {loading ? "Analyzing..." : "Generate with AI"}
        </Button>
      </div>

      {!hasCompany && (
        <div className="card-elevated p-6 border-warm/40 bg-warm/5">
          <div className="flex gap-3">
            <Building2 className="h-5 w-5 text-warm shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-primary-deep">Add your company first</p>
              <p className="text-sm text-muted-foreground">
                We need your company profile to generate market insights.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Similar products */}
      <section>
        <h2 className="text-xl font-display font-bold text-primary-deep mb-3">Products like yours</h2>
        {loading && <Skeleton className="h-40 rounded-2xl" />}
        {!loading && similar.length === 0 && hasCompany && (
          <p className="text-sm text-muted-foreground card-elevated p-6 text-center">
            Generate to see competitor analysis and your advantage.
          </p>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {similar.map((p, i) => (
            <div key={i} className="card-elevated p-6">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-display font-bold text-primary-deep">{p.name}</h3>
                <span className="text-[10px] font-semibold bg-secondary text-secondary-foreground px-2 py-0.5 rounded">
                  {p.category}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-4">Targets: {p.audience}</p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="font-semibold text-success mb-1">Strengths</p>
                  <ul className="space-y-1 text-foreground/80">
                    {p.strengths.map((s, j) => (
                      <li key={j}>• {s}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-destructive mb-1">Weaknesses</p>
                  <ul className="space-y-1 text-foreground/80">
                    {p.weaknesses.map((s, j) => (
                      <li key={j}>• {s}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border/60">
                <p className="text-xs font-semibold text-primary mb-1">Your advantage</p>
                <p className="text-sm text-foreground/85">{p.your_advantage}</p>
              </div>
              {p.references && p.references.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/60">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">References</p>
                  <div className="flex flex-wrap gap-1.5">
                    {p.references.map((r, j) => (
                      <a
                        key={j}
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline bg-primary/5 border border-primary/15 rounded px-2 py-0.5"
                      >
                        {r.label}
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Best companies */}
      <section>
        <h2 className="text-xl font-display font-bold text-primary-deep mb-3">Best companies to target</h2>
        {!loading && targets.length === 0 && hasCompany && (
          <p className="text-sm text-muted-foreground card-elevated p-6 text-center">
            Generate to see ideal customer profiles.
          </p>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {targets.map((t, i) => {
            const lvl = LEVEL_BADGES[t.level] ?? LEVEL_BADGES.medium;
            const title = t.company ?? t.type ?? "Target";
            return (
              <div key={i} className="card-elevated p-6">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <h3 className="font-display font-bold text-primary-deep truncate">{title}</h3>
                    {t.website && (
                      <a
                        href={t.website.startsWith("http") ? t.website : `https://${t.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        {t.website.replace(/^https?:\/\//, "")}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold border px-2 py-1 rounded-md whitespace-nowrap ${lvl.color}`}>
                    {lvl.label}
                  </span>
                </div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">
                  {t.industry}{t.size ? ` • ${t.size}` : ""}
                </p>
                <div className="text-sm text-foreground/85 mb-3">
                  <p className="font-semibold text-primary-deep">Their problem</p>
                  <p>{t.problem}</p>
                </div>
                <div className="border-t border-border/60 pt-3 text-xs text-foreground/85 mb-3">
                  <p className="font-semibold text-primary-deep mb-1">Why you can sell</p>
                  <p>{t.why}</p>
                </div>
                {t.designations && t.designations.length > 0 && (
                  <div className="border-t border-border/60 pt-3 mb-3">
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                      <Users className="h-3 w-3" /> Designations to pitch
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {t.designations.map((d, j) => (
                        <span key={j} className="text-[11px] bg-secondary text-secondary-foreground rounded px-2 py-0.5">
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {t.focus_areas && t.focus_areas.length > 0 && (
                  <div className="border-t border-border/60 pt-3 mb-3">
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                      <Crosshair className="h-3 w-3" /> Areas to pitch
                    </p>
                    <ul className="space-y-1 text-xs text-foreground/85">
                      {t.focus_areas.map((f, j) => (
                        <li key={j}>• {f}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {t.references && t.references.length > 0 && (
                  <div className="border-t border-border/60 pt-3">
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">References (verify)</p>
                    <div className="flex flex-wrap gap-1.5">
                      {t.references.map((r, j) => (
                        <a
                          key={j}
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline bg-primary/5 border border-primary/15 rounded px-2 py-0.5"
                        >
                          {r.label}
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
