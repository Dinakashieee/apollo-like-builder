import { Workflow, Mail, Clock, MessageSquare, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const presets = [
  { icon: Mail, title: "Initial outreach", desc: "Personalized first email — sent on enrollment", delay: "Instant" },
  { icon: Clock, title: "1st follow-up", desc: "Friendly nudge if no reply", delay: "+3 days" },
  { icon: Clock, title: "2nd follow-up", desc: "Re-frame value with case study", delay: "+5 days" },
  { icon: MessageSquare, title: "Final break-up", desc: "Soft close, leave the door open", delay: "+10 days" },
];

export default function Automation() {
  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div>
        <p className="text-sm text-primary font-medium mb-1 flex items-center gap-1.5">
          <Workflow className="h-3.5 w-3.5" /> Sequences
        </p>
        <h1 className="text-3xl lg:text-4xl font-display font-bold text-primary-deep">
          Follow-Up Automation
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-xl">
          Coming soon — automated multi-step sequences. Below is the default cadence we'll launch with.
        </p>
      </div>

      <div className="card-elevated p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-primary-deep">Default sequence preview</h3>
            <p className="text-xs text-muted-foreground">Triggered when a lead is added</p>
          </div>
        </div>

        <div className="relative space-y-3">
          <div className="absolute left-[19px] top-6 bottom-6 w-px bg-gradient-to-b from-primary/40 via-border to-transparent" />
          {presets.map((step, i) => (
            <div
              key={i}
              className="relative flex items-center gap-4 p-4 rounded-xl border border-border/60 bg-card"
            >
              <div className="h-10 w-10 rounded-xl bg-gradient-primary shadow-glow flex items-center justify-center shrink-0">
                <step.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm text-primary-deep">{step.title}</p>
                  <span className="text-[10px] font-bold bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded">
                    {step.delay}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/20 text-sm text-foreground/85">
          💡 Use the <strong>Smart Email Composer</strong> now to generate emails one at a time. Automated sequences ship next.
        </div>
      </div>
    </div>
  );
}
