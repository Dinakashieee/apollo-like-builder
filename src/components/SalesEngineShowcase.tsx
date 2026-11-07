import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Search, Users, Target, Mail, BarChart3, CheckCircle2, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

const stages = [
  { name: "Detect", icon: Search, title: "Company signals", subtitle: "Research companies against your ideal customer profile.", rows: [
    { name: "Northstar Software", detail: "B2B software · target account", status: "Research" },
    { name: "Harbor Logistics", detail: "Logistics · target account", status: "Research" },
    { name: "Summit Services", detail: "Professional services · target account", status: "Research" },
  ], points: ["Save your company profile and targeting criteria", "Discover matching accounts and competitors", "Review public evidence and source dates"] },
  { name: "Find", icon: Users, title: "Decision-maker discovery", subtitle: "Build a contact list for the companies you want to approach.", rows: [
    { name: "Operations Director", detail: "Northstar Software · verify current role", status: "Review" },
    { name: "Head of Procurement", detail: "Harbor Logistics · verify current role", status: "Review" },
    { name: "Managing Director", detail: "Summit Services · verify current role", status: "Review" },
  ], points: ["Search contacts with SignalHire", "Review profiles before revealing contact details", "Add leads manually, import CSVs and organise lists"] },
  { name: "Qualify", icon: Target, title: "Account intelligence", subtitle: "Prioritise opportunities with evidence, not guesswork.", rows: [
    { name: "Fit", detail: "Compare the account with your company profile", status: "Score" },
    { name: "Intent & Signal", detail: "Review supported company research", status: "Evidence" },
    { name: "Buying stage", detail: "Unsupported information stays unknown", status: "Review" },
  ], points: ["Compare Fit, Intent, Signal and Stage", "Read company-specific evidence", "Choose which opportunities deserve outreach"] },
  { name: "Outreach", icon: Mail, title: "Personalised outreach", subtitle: "Bring account context into every conversation.", rows: [
    { name: "Email draft", detail: "Company context and your personal signature", status: "Draft" },
    { name: "Follow-up sequence", detail: "Scheduled steps with sending breaks", status: "Schedule" },
    { name: "Landing page", detail: "A branded page for a lead or campaign", status: "Create" },
  ], points: ["Draft tailored emails and use WhatsApp", "Schedule email follow-ups with pause and resume", "Share personalised or campaign landing pages"] },
  { name: "Track deals", icon: BarChart3, title: "Activity & pipeline", subtitle: "Keep your team close to the next action.", rows: [
    { name: "Lead activity", detail: "Conversations, follow-ups and lead status", status: "Track" },
    { name: "Ghost Analysis", detail: "Review patterns in sent outreach per account", status: "Analyse" },
    { name: "Daily update", detail: "One message captures progress and next steps", status: "Update" },
  ], points: ["Track lead status and account activity", "Review personal activity summaries", "Turn daily work updates into follow-up tasks"] },
];

export function SalesEngineShowcase({ signedIn }: { signedIn: boolean }) {
  const [selected, setSelected] = useState(0);
  const stage = stages[selected] ?? stages[0];

  return (
    <section id="sales-engine" className="sales-engine py-16 sm:py-20 border-y border-border scroll-mt-20" aria-labelledby="sales-engine-title">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-10">
          <div>
            <p className="text-primary font-semibold text-xs uppercase mb-3">One connected sales workflow</p>
            <h2 id="sales-engine-title" className="font-display font-bold text-3xl sm:text-4xl text-foreground">EngageIQ.lk <span className="text-primary">Sales Engine</span></h2>
            <p className="mt-4 text-muted-foreground max-w-xl">Find accounts, reach the right people and keep every opportunity moving.</p>
          </div>
          <span className="text-xs text-muted-foreground shrink-0">Illustrative workflow · not live account data</span>
        </div>

        <div role="tablist" aria-label="Sales workflow" className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-8">
          {stages.map((item, index) => (
            <Button key={item.name} id={`engine-tab-${index}`} role="tab" aria-selected={selected === index} aria-controls="engine-panel" variant={selected === index ? "default" : "outline"} className="h-auto min-h-20 flex-col gap-2 whitespace-normal rounded-md" onClick={() => setSelected(index)}>
              <span className="flex items-center gap-2"><span className="text-xs opacity-70">0{index + 1}</span><item.icon className="h-5 w-5" /></span>
              <span className="font-semibold">{item.name}</span>
            </Button>
          ))}
        </div>

        <div id="engine-panel" role="tabpanel" aria-labelledby={`engine-tab-${selected}`} className="grid lg:grid-cols-2 border-t border-border">
          <div className="pt-7 lg:pr-8">
            <div className="flex items-center justify-between gap-3 mb-5">
              <h3 className="font-display text-xl font-bold">{stage.title}</h3>
              <span className="text-xs font-medium text-primary">Sample preview</span>
            </div>
            <div className="divide-y divide-border">
              {stage.rows.map((row) => (
                <div key={row.name} className="flex items-center gap-3 py-5 min-h-24">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-accent text-primary rounded-full"><stage.icon className="h-5 w-5" /></span>
                  <div className="flex-1 min-w-0"><p className="text-sm font-semibold">{row.name}</p><p className="text-xs text-muted-foreground mt-1 leading-relaxed">{row.detail}</p></div>
                  <span className="text-xs text-primary font-semibold shrink-0">{row.status}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-7 lg:pl-8 lg:border-l border-border flex flex-col">
            <p className="text-xs uppercase font-semibold text-primary mb-4">Inside your workspace</p>
            <p className="text-lg font-medium leading-relaxed min-h-16">{stage.subtitle}</p>
            <ul className="space-y-5 my-7">
              {stage.points.map((point) => <li key={point} className="flex items-start gap-3 text-sm leading-relaxed"><CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />{point}</li>)}
            </ul>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-auto pb-5"><Globe className="h-4 w-4 shrink-0" />Your accounts. Your conversations. One workspace.</div>
          </div>
        </div>

        <div className="border-t border-border pt-7 mt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <p className="font-display font-semibold text-lg">From the first signal to the next step.</p>
          <div className="flex flex-wrap gap-3">
            <Button asChild><Link to={signedIn ? "/app" : "/auth"}>Get started free <ArrowRight className="h-4 w-4" /></Link></Button>
            <Button asChild variant="outline"><Link to="/demo">Book a demo</Link></Button>
          </div>
        </div>
      </div>
    </section>
  );
}