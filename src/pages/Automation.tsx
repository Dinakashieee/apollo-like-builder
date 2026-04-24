import { Workflow, Mail, Clock, MessageSquare, Plus, Save, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

const steps = [
  { icon: Mail, label: "Email Integration", channel: "Gmail · 3 accounts", enabled: true, delay: "Instant" },
  { icon: Clock, label: "1st Follow-Up After", channel: "3 days · skip weekends", enabled: true, delay: "+3d" },
  { icon: Clock, label: "2nd Follow-Up After", channel: "5 days · only if no reply", enabled: true, delay: "+5d" },
  { icon: MessageSquare, label: "LinkedIn Touch", channel: "Connection request + note", enabled: false, delay: "+8d" },
  { icon: Mail, label: "Final Break-up Email", channel: "Soft close template", enabled: true, delay: "+14d" },
];

const intents = [
  { label: "Open Conversation", color: "bg-primary text-primary-foreground" },
  { label: "Challenge Pain Points", color: "bg-secondary text-secondary-foreground" },
  { label: "Position Solutions", color: "bg-secondary text-secondary-foreground" },
];

export default function Automation() {
  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground font-medium mb-1">12 active sequences · 4,820 contacts enrolled</p>
          <h1 className="text-3xl lg:text-4xl font-display font-bold text-primary-deep">
            Follow-Up Automation
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" /> New Sequence
          </Button>
          <Button size="sm" className="bg-gradient-primary shadow-glow">
            <Save className="h-4 w-4 mr-2" /> Save Changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card-elevated p-6 lg:col-span-2 animate-fade-up">
          <div className="flex items-center gap-2 mb-5">
            <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
              <Workflow className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-primary-deep">Sequence: Enterprise Outbound</h3>
              <p className="text-xs text-muted-foreground">Triggered when lead score &gt; 75</p>
            </div>
          </div>

          <div className="relative space-y-3">
            <div className="absolute left-[19px] top-6 bottom-6 w-px bg-gradient-to-b from-primary/40 via-border to-transparent" />
            {steps.map((step, i) => (
              <div
                key={i}
                className="relative flex items-center gap-4 p-4 rounded-xl border border-border/60 bg-card hover:shadow-card transition-shadow animate-fade-up"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div
                  className={`relative h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                    step.enabled ? "bg-gradient-primary shadow-glow" : "bg-muted"
                  }`}
                >
                  <step.icon
                    className={`h-5 w-5 ${step.enabled ? "text-primary-foreground" : "text-muted-foreground"}`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-primary-deep">{step.label}</p>
                    <span className="text-[10px] font-bold bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded">
                      {step.delay}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.channel}</p>
                </div>
                <button className="text-xs font-medium text-muted-foreground hover:text-primary flex items-center gap-1">
                  Edit <ChevronDown className="h-3 w-3" />
                </button>
                <Switch defaultChecked={step.enabled} />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card-elevated p-5 animate-fade-up" style={{ animationDelay: "120ms" }}>
            <h3 className="font-display font-bold text-base text-primary-deep mb-4">Email Intent</h3>
            <div className="space-y-2">
              {intents.map((i) => (
                <button
                  key={i.label}
                  className={`w-full text-left text-xs font-semibold px-3 py-2.5 rounded-lg ${i.color} transition-all hover:opacity-90`}
                >
                  ○ {i.label}
                </button>
              ))}
            </div>
          </div>

          <div className="card-elevated p-5 animate-fade-up" style={{ animationDelay: "180ms" }}>
            <h3 className="font-display font-bold text-base text-primary-deep mb-4">Performance</h3>
            <div className="space-y-4">
              {[
                { label: "Open rate", value: 71 },
                { label: "Reply rate", value: 25 },
                { label: "Meeting booked", value: 12 },
              ].map((p) => (
                <div key={p.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-muted-foreground">{p.label}</span>
                    <span className="text-sm font-bold text-primary-deep">{p.value}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-gradient-primary rounded-full" style={{ width: `${p.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
