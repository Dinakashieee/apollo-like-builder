import { useEffect, useState } from "react";
import { Sparkles, RefreshCw, Target, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
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

const LEVEL_BADGES = {
  high: { label: "🔥 High", color: "bg-hot/15 text-hot border-hot/30" },
  medium: { label: "⚠️ Medium", color: "bg-warm/15 text-warm border-warm/30" },
  low: { label: "❄️ Low", color: "bg-cold/15 text-cold border-cold/30" },
};

export default function Intelligence() {
  const { current } = useWorkspace();
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [hasCompany, setHasCompany] = useState(false);

  const load = async () => {
    if (!current) return;
    setLoading(true);
    const [{ data: opps }, { data: company }] = await Promise.all([
      supabase
        .from("opportunities")
        .select("*")
        .eq("workspace_id", current.id)
        .order("score", { ascending: false }),
      supabase
        .from("company_profiles")
        .select("id")
        .eq("workspace_id", current.id)
        .maybeSingle(),
    ]);
    setOpportunities((opps ?? []) as Opportunity[]);
    setHasCompany(!!company);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  const generate = async () => {
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
        body: { workspace_id: current.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({
        title: "Opportunities generated",
        description: `${data?.count ?? 0} new opportunities added.`,
      });
      await load();
    } catch (e: any) {
      toast({
        title: "Generation failed",
        description: e?.message ?? "Try again later.",
        variant: "destructive",
      });
    }
    setGenerating(false);
  };

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
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Discover the best opportunity areas, target industries, and problems your product solves.
          </p>
        </div>
        <Button onClick={generate} disabled={generating} className="bg-gradient-primary shadow-glow">
          {generating ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          {generating ? "Generating..." : "Generate with AI"}
        </Button>
      </div>

      {!hasCompany && (
        <div className="card-elevated p-6 border-warm/40 bg-warm/5">
          <div className="flex gap-3">
            <Building2 className="h-5 w-5 text-warm shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-primary-deep">Add your company first</p>
              <p className="text-sm text-muted-foreground">
                The AI uses your company profile and products to generate insights.
              </p>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      )}

      {!loading && opportunities.length === 0 && hasCompany && (
        <div className="card-elevated p-12 text-center">
          <Target className="h-10 w-10 text-primary mx-auto mb-3" />
          <p className="font-semibold text-primary-deep">No opportunities yet</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Click "Generate with AI" above to discover where you can win.
          </p>
        </div>
      )}

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
              {o.problem && (
                <p className="text-sm text-foreground/85 mb-3 leading-relaxed">{o.problem}</p>
              )}
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
    </div>
  );
}
