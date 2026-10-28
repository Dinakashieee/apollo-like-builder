import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Rocket,
  Users,
  Mail,
  Bell,
  LifeBuoy,
  ArrowRight,
  PlayCircle,
  Target,
  ClipboardCheck,
  Workflow,
  ChartNoAxesCombined,
  Building2,
} from "lucide-react";

const steps = [
  {
    n: 1,
    title: "Set up your company profile",
    desc: "Save your products, positioning, target industries and pain points, plus meeting details, company credentials and personal email signatures.",
    icon: Building2,
    to: "/app/company",
  },
  {
    n: 2,
    title: "Discover target accounts",
    desc: "Review target recommendations and their public sources. Check publication dates where available and verify decision-makers and current roles on LinkedIn.",
    icon: Target,
    to: "/app/targets",
  },
  {
    n: 3,
    title: "Find and save contacts",
    desc: "Search SignalHire and review real profile previews before revealing contacts. API account credits and the EngageIQ.lk reveal wallet are separate. You can also add leads manually or import a CSV.",
    icon: Users,
    to: "/app/signalhire",
  },
  {
    n: 4,
    title: "Review company signals",
    desc: "Saved leads create linked company accounts. EngageIQ generates Fit, Intent, Signal Strength and Buying Stage with evidence; unsupported signals stay unknown. Review divisions, products and services, or export companies.",
    icon: ChartNoAxesCombined,
    to: "/app/companies",
  },
  {
    n: 5,
    title: "Send personalised outreach",
    desc: "Compose email with company context and your chosen signature, or use a lead's WhatsApp tab. Email Health tracks logged sends and highlights 50 per day, with a break reminder and an explicit Resume control.",
    icon: Mail,
    to: "/app/composer",
  },
  {
    n: 6,
    title: "Run campaigns and follow-ups",
    desc: "Build email sequences, prepare campaign landing pages with your branding and images, and set reminders to keep follow-ups moving.",
    icon: Workflow,
    to: "/app/automation",
  },
  {
    n: 7,
    title: "Post one daily update",
    desc: "Send one daily work message with completed work, next steps and blockers. It fills your dashboard summary and personal tasks, and applies explicit lead status requests only when a unique lead matches. Review Today, Week, Month or Quarter.",
    icon: ClipboardCheck,
    to: "/app",
  },
];

export default function GettingStarted() {
  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-10">
      {/* Hero */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
          <Rocket className="h-3.5 w-3.5" /> Getting Started
        </div>
        <h1 className="text-3xl md:text-4xl font-bold">How EngageIQ.lk works</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          From company setup and verified research to personalised outreach, campaigns and one-message daily updates.
        </p>
      </div>

      {/* Workflow diagram */}
      <section>
        <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <PlayCircle className="h-5 w-5 text-primary" /> The workflow
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
          {steps.map((s, i) => (
            <div key={s.n} className="relative">
              <Link
                to={s.to}
                className="block h-full p-5 rounded-lg border bg-card hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
              >
                <div
                  className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3"
                >
                  <s.icon className="h-6 w-6" />
                </div>
                <div className="text-xs font-bold text-muted-foreground uppercase">
                  Step {s.n}
                </div>
                <div className="font-semibold text-base mt-1 flex items-center justify-between gap-2">{s.title}<ArrowRight className="h-4 w-4 shrink-0" /></div>
                <p className="text-sm text-muted-foreground mt-2">{s.desc}</p>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Help + quick wins */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-6 space-y-3">
          <div className="flex items-center gap-2">
            <LifeBuoy className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Need help?</h3>
          </div>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>• <strong>Help Center</strong> — documentation and common questions</li>
            <li>• <strong>Support</strong> — direct message to our team</li>
            <li>• <strong>Email</strong> — typical response within a few hours</li>
          </ul>
          <div className="flex gap-2 pt-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/app/help">Open Help</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/app/support">Contact Support</Link>
            </Button>
          </div>
        </Card>

        <Card className="p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Recommended first session</h3>
          </div>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal pl-5">
            <li>Save your context and signature in <Link to="/app/company" className="text-primary underline">Company</Link></li>
            <li>Add or import a contact in <Link to="/app/leads" className="text-primary underline">Leads</Link>, or review a <Link to="/app/signalhire" className="text-primary underline">SignalHire</Link> result before claiming</li>
            <li>Review the linked account and evidence in <Link to="/app/companies" className="text-primary underline">Companies</Link></li>
            <li>Prepare a personalised email, then post one daily work update with your next steps</li>
          </ol>
        </Card>
      </div>

    </div>
  );
}
