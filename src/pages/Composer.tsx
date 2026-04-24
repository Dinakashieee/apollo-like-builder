import { Sparkles, Paperclip, Image as ImageIcon, Send, ChevronDown, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AvatarBubble } from "@/components/AvatarBubble";
import { leads } from "@/data/leads";

export default function Composer() {
  const lead = leads[0];

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-primary font-medium mb-1 flex items-center gap-1.5">
            <Wand2 className="h-3.5 w-3.5" /> AI-assisted writing
          </p>
          <h1 className="text-3xl lg:text-4xl font-display font-bold text-primary-deep">
            Smart Email Composer
          </h1>
        </div>
        <Button className="bg-gradient-primary shadow-glow">
          <Sparkles className="h-4 w-4 mr-2" /> Generate with AI
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card-elevated p-6 lg:col-span-2 animate-fade-up">
          {/* Recipient */}
          <div className="flex items-center justify-between pb-4 border-b border-border/60 mb-5">
            <div className="flex items-center gap-3">
              <AvatarBubble lead={lead} size="lg" />
              <div>
                <p className="font-semibold text-base text-primary-deep">{lead.name}</p>
                <p className="text-xs text-muted-foreground">{lead.title} · {lead.company}</p>
              </div>
            </div>
            <button className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-border/60 hover:bg-muted/50 transition-colors">
              <Sparkles className="h-3 w-3 text-primary" /> Sequence A1
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>

          {/* Subject */}
          <div className="mb-5">
            <label className="text-[11px] uppercase font-semibold tracking-wider text-muted-foreground">
              Subject
            </label>
            <input
              defaultValue="Aligning Oracle ERP with JDGlobal's Growth"
              className="w-full bg-transparent border-0 border-b border-border/40 focus:border-primary focus:ring-0 outline-none py-2 text-base font-semibold text-primary-deep"
            />
          </div>

          {/* Body */}
          <div className="space-y-4 text-sm leading-relaxed text-foreground/85">
            <p className="font-medium text-primary-deep">Hi Natalie,</p>
            <p>
              I noticed JDGlobal's recent expansion into Germany and the operations
              scaling alongside it. As your team manages Microsoft 365 and Oracle ERP
              workflows, I wanted to share how teams in your space are{" "}
              <span className="bg-primary/10 text-primary font-semibold px-1 rounded">
                automating cross-system handoffs
              </span>{" "}
              to cut costs and improve efficiency.
            </p>
            <p>
              Would 15 minutes next Tuesday work to walk you through what's possible
              with a connected revenue stack?
            </p>
            <p className="text-muted-foreground">
              — Sent via EngageIQ
            </p>
          </div>

          {/* Toolbar */}
          <div className="mt-6 pt-4 border-t border-border/60 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-9 w-9"><Paperclip className="h-4 w-4 text-muted-foreground" /></Button>
              <Button variant="ghost" size="icon" className="h-9 w-9"><ImageIcon className="h-4 w-4 text-muted-foreground" /></Button>
              <Button variant="ghost" size="sm" className="h-9 text-xs gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Personalize
              </Button>
            </div>
            <Button className="bg-gradient-primary shadow-glow gap-2">
              Send Email <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* AI suggestions side */}
        <div className="space-y-4">
          <div className="card-elevated p-5 animate-fade-up" style={{ animationDelay: "120ms" }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <h3 className="font-display font-bold text-base text-primary-deep">AI Insights</h3>
            </div>
            <div className="space-y-3">
              {[
                { label: "Sentiment match", value: "Professional", color: "text-warm" },
                { label: "Predicted reply rate", value: "68%", color: "text-success" },
                { label: "Tone confidence", value: "High", color: "text-primary" },
                { label: "Spam risk", value: "Low", color: "text-success" },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className={`font-semibold ${s.color}`}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card-elevated p-5 animate-fade-up" style={{ animationDelay: "180ms" }}>
            <h3 className="font-display font-bold text-base text-primary-deep mb-3">
              Suggested edits
            </h3>
            <div className="space-y-2 text-xs">
              {[
                "Mention recent Series B announcement",
                "Reference shared connection: Sara Lee",
                "Add case study link from Helio Labs",
              ].map((s) => (
                <button
                  key={s}
                  className="w-full text-left p-3 rounded-lg border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all flex items-start gap-2"
                >
                  <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground/85 font-medium">{s}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
