import { useState } from "react";
import { Sparkles, Loader2, CheckCircle2, AlertTriangle, XCircle, Target, Workflow, Lightbulb, Users, Server, Swords, ExternalLink, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface TechItem { name: string; category: string; is_competitor_of_user: boolean; confidence: "known" | "likely" }
interface PainTarget { pain_point: string; target_role: string; why: string; linkedin_search_url: string }
interface EmployeeSignal { title: string; url: string; snippet: string }

interface Intelligence {
  focus_areas: string[];
  tech_stack: TechItem[];
  likely_processes: string[];
  gaps: string[];
  pain_point_targets: PainTarget[];
  fit_summary: string;
  contact_fit: "ideal" | "okay" | "wrong";
  contact_reasoning: string;
  better_contacts: string[];
  opening_angles: string[];
  employee_signals?: EmployeeSignal[];
  has_linkedin_url?: boolean;
}

const FIT_META: Record<string, { cls: string; icon: any; label: string }> = {
  ideal: { cls: "bg-success/15 text-success border-success/30", icon: CheckCircle2, label: "Right person" },
  okay: { cls: "bg-warm/15 text-warm border-warm/30", icon: AlertTriangle, label: "Could be better" },
  wrong: { cls: "bg-destructive/15 text-destructive border-destructive/30", icon: XCircle, label: "Wrong contact" },
};

export function LeadIntelligencePanel({ leadId, contactName }: { leadId: string; contactName?: string }) {
  const [data, setData] = useState<Intelligence | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    const { data: resp, error } = await supabase.functions.invoke("lead-intelligence", {
      body: { lead_id: leadId },
    });
    setLoading(false);
    if (error || (resp as any)?.error) {
      toast({
        title: "Couldn't generate intelligence",
        description: (resp as any)?.error || error?.message || "Try again",
        variant: "destructive",
      });
      return;
    }
    setData(resp as Intelligence);
  };

  if (!data && !loading) {
    return (
      <div className="text-center py-10 space-y-3">
        <Sparkles className="h-8 w-8 mx-auto text-primary" />
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Generate an AI brief: what this lead focuses on, how they likely operate, what's lacking,
          whether {contactName || "this contact"} is the right person to write to, and how your company fits.
        </p>
        <Button onClick={run} size="sm">
          <Sparkles className="h-4 w-4 mr-2" /> Generate intelligence
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Analyzing lead & your company fit…
      </div>
    );
  }

  const fit = FIT_META[data!.contact_fit] ?? FIT_META.okay;
  const FitIcon = fit.icon;

  return (
    <div className="space-y-5">
      <div className={`rounded-lg border p-4 ${fit.cls}`}>
        <div className="flex items-center gap-2 mb-1">
          <FitIcon className="h-4 w-4" />
          <span className="text-sm font-semibold">Contact fit · {fit.label}</span>
        </div>
        <p className="text-xs opacity-90">{data!.contact_reasoning}</p>
        {data!.better_contacts.length > 0 && (
          <div className="mt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80 mb-1.5 flex items-center gap-1">
              <Users className="h-3 w-3" /> Try reaching instead
            </p>
            <div className="flex flex-wrap gap-1.5">
              {data!.better_contacts.map((c) => (
                <Badge key={c} variant="outline" className="text-[11px]">{c}</Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      <Section icon={Target} title="What they focus on" items={data!.focus_areas} />

      {data!.tech_stack?.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <Server className="h-3.5 w-3.5" /> Systems & tools they likely use
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {data!.tech_stack.map((t, i) => (
              <div
                key={i}
                className={`rounded-md border p-2.5 text-sm flex items-start justify-between gap-2 ${
                  t.is_competitor_of_user
                    ? "border-destructive/40 bg-destructive/5"
                    : "border-border/60 bg-muted/30"
                }`}
              >
                <div className="min-w-0">
                  <div className="font-medium text-foreground/90 truncate flex items-center gap-1.5">
                    {t.is_competitor_of_user && <Swords className="h-3 w-3 text-destructive shrink-0" />}
                    {t.name}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {t.category} · {t.confidence}
                  </div>
                </div>
                {t.is_competitor_of_user && (
                  <Badge variant="outline" className="text-[10px] border-destructive/40 text-destructive shrink-0">
                    Competitor
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <Section icon={Workflow} title="How they likely operate today" items={data!.likely_processes} />
      <Section icon={AlertTriangle} title="What's likely lacking" items={data!.gaps} />

      {data!.pain_point_targets?.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> Who to target for each pain point
          </p>
          <div className="space-y-2">
            {data!.pain_point_targets.map((p, i) => (
              <div key={i} className="rounded-md border border-border/60 p-3 bg-muted/20">
                <div className="text-sm font-medium text-foreground/90">{p.pain_point}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Reach out to <span className="text-foreground/90 font-medium">{p.target_role}</span> — {p.why}
                </div>
                <a
                  href={p.linkedin_search_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  <Linkedin className="h-3.5 w-3.5" /> Find {p.target_role} on LinkedIn
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border/60 p-4 bg-primary/5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-primary mb-1.5">
          How your company fits
        </p>
        <p className="text-sm text-foreground/90 leading-relaxed">{data!.fit_summary}</p>
      </div>

      <Section icon={Lightbulb} title="Opening angles to use" items={data!.opening_angles} />

      <Button variant="ghost" size="sm" onClick={run} className="w-full">
        <Sparkles className="h-3.5 w-3.5 mr-2" /> Regenerate
      </Button>
    </div>
  );
}

function Section({ icon: Icon, title, items }: { icon: any; title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" /> {title}
      </p>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="text-sm text-foreground/90 flex gap-2">
            <span className="text-primary mt-1">•</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
