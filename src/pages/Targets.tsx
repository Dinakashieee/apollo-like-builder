import { useEffect, useState } from "react";
import { Sparkles, Target, RefreshCw, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface SimilarProduct {
  name: string;
  category: string;
  strengths: string[];
  weaknesses: string[];
  audience: string;
  your_advantage: string;
}

interface TargetCompany {
  type: string;
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
            return (
              <div key={i} className="card-elevated p-6">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-display font-bold text-primary-deep">{t.type}</h3>
                  <span className={`text-[10px] font-bold border px-2 py-1 rounded-md ${lvl.color}`}>
                    {lvl.label}
                  </span>
                </div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">
                  {t.industry}
                </p>
                <div className="text-sm text-foreground/85 mb-3">
                  <p className="font-semibold text-primary-deep">Their problem</p>
                  <p>{t.problem}</p>
                </div>
                <div className="border-t border-border/60 pt-3 text-xs text-muted-foreground">
                  <p className="font-semibold text-primary-deep mb-1">Why you can sell</p>
                  <p>{t.why}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
