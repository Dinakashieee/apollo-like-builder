import { Sparkles, ChevronDown, MoreHorizontal, Mail, Cloud, Layers, Target, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AvatarBubble } from "@/components/AvatarBubble";
import { leads } from "@/data/leads";

const matchingRules = [
  { icon: Sparkles, label: "AI Automation", chips: ["Integration", "Cloud Services"] },
  { icon: Target, label: "Follow-Up", chips: ["55%", "Position Outcomes"] },
  { icon: MessageSquare, label: "Email Intent", chips: ["Open Conversation", "Position Solutions"] },
];

const accounts = leads.slice(0, 3);

export default function Intelligence() {
  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-primary font-medium mb-1 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Powered by EngageIQ AI
          </p>
          <h1 className="text-3xl lg:text-4xl font-display font-bold text-primary-deep">
            AI Deal Intelligence
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Unified Command Center */}
        <div className="card-elevated p-6 lg:col-span-2 animate-fade-up">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
                <Layers className="h-4 w-4 text-primary-foreground" />
              </div>
              <h3 className="font-display font-bold text-lg text-primary-deep">
                Unified Command Center
              </h3>
            </div>
            <button>
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Active account */}
          <div className="rounded-xl border border-border/60 p-4 bg-muted/20 mb-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-foreground/90">natalie@jdglobal.com</span>
              </div>
              <Button size="sm" className="h-7 bg-gradient-primary text-xs shadow-soft">
                Change Account
              </Button>
            </div>

            <div className="border-t border-border/60 pt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary-deep">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Lead Enrichment
                </div>
                <button>
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-border/60 bg-background hover:border-primary/40 transition-colors">
                <span className="flex items-center gap-2 text-sm">
                  <Cloud className="h-4 w-4 text-primary" />
                  <span className="font-medium">Apollo.io</span>
                  <span className="text-[10px] font-semibold bg-success/10 text-success px-1.5 py-0.5 rounded">Synced</span>
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Matching rules */}
          <div>
            <h4 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">
              Matching Rules
            </h4>
            <div className="space-y-2">
              {matchingRules.map((rule) => (
                <div
                  key={rule.label}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border/60 hover:border-primary/30 hover:bg-muted/30 transition-all cursor-pointer"
                >
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  <rule.icon className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium flex-1">{rule.label}</span>
                  <div className="flex items-center gap-1.5">
                    {rule.chips.map((c) => (
                      <span
                        key={c}
                        className="text-[10px] font-semibold bg-secondary text-secondary-foreground px-2 py-1 rounded-md"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Accounts */}
        <div className="card-elevated p-6 animate-fade-up" style={{ animationDelay: "120ms" }}>
          <h3 className="font-display font-bold text-lg text-primary-deep mb-5">
            AI-Scored Accounts
          </h3>
          <div className="space-y-4">
            {accounts.map((lead) => (
              <div key={lead.id} className="rounded-xl border border-border/60 p-4 hover:shadow-card transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <AvatarBubble lead={lead} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-primary-deep">{lead.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{lead.title}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Intent score</span>
                    <span className="font-bold text-primary">{[92, 78, 88][accounts.indexOf(lead)]}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-gradient-primary"
                      style={{ width: `${[92, 78, 88][accounts.indexOf(lead)]}%` }}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-3">
                  {lead.tools.map((t) => (
                    <span key={t} className="text-[10px] font-semibold bg-accent text-accent-foreground px-2 py-0.5 rounded-md">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
