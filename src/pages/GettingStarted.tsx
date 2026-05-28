import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Rocket,
  Users,
  Sparkles,
  Mail,
  Bell,
  MessageCircle,
  LifeBuoy,
  ArrowRight,
  PlayCircle,
  Target,
  Brain,
  Building2,
  Play,
} from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const steps = [
  {
    n: 1,
    title: "Set up your company profile",
    desc: "Add your products, positioning, target industries, and the pain points you solve. The AI uses this to personalise every message.",
    icon: Building2,
    to: "/app/company",
    color: "from-slate-500 to-slate-700",
  },
  {
    n: 2,
    title: "Build your target list",
    desc: "Pull AI-curated target companies filtered by your industries, size, and the systems they use today.",
    icon: Target,
    to: "/app/targets",
    color: "from-indigo-500 to-blue-600",
  },
  {
    n: 3,
    title: "Add leads",
    desc: "Claim targets as leads, enter contacts manually, or upload a CSV. Each lead holds the company, contact, and conversation history.",
    icon: Users,
    to: "/app/leads",
    color: "from-blue-500 to-cyan-500",
  },
  {
    n: 4,
    title: "Generate lead intelligence",
    desc: "AI scrapes the company's public footprint to surface focus areas, likely tech stack, specific gaps, and the right people to contact.",
    icon: Brain,
    to: "/app/intelligence",
    color: "from-fuchsia-500 to-purple-500",
  },
  {
    n: 5,
    title: "Send outbound email",
    desc: "Draft from scratch or use AI-suggested replies grounded in the lead's intelligence and your positioning.",
    icon: Mail,
    to: "/app/composer",
    color: "from-amber-500 to-orange-500",
  },
  {
    n: 6,
    title: "Engage on WhatsApp",
    desc: "Open a lead → WhatsApp tab → review the AI-suggested reply → send. The full thread stays attached to the lead.",
    icon: MessageCircle,
    to: "/app/leads",
    color: "from-green-500 to-emerald-500",
  },
  {
    n: 7,
    title: "Track everything",
    desc: "Every claimed lead, email sent, WhatsApp thread, reply, and reminder is logged on the lead timeline — and surfaced in the dashboard so you always see what's open, what's waiting, and what's next.",
    icon: Bell,
    to: "/app/reminders",
    color: "from-rose-500 to-pink-500",
  },
];

const flow = [
  {
    n: "01",
    title: "Define your offer",
    body: "Enter who you are, what you sell, the industries you serve, and the problems you solve.",
  },
  {
    n: "02",
    title: "Identify fit accounts",
    body: "Pull a filtered list of companies from market databases and competitor-usage data that match your ICP.",
  },
  {
    n: "03",
    title: "Convert to leads",
    body: "Claim accounts into your pipeline with contacts, role, and preferred channel.",
  },
  {
    n: "04",
    title: "Enrich with AI",
    body: "Run lead intelligence for focus areas, likely tech stack, company-specific gaps, and recommended target roles.",
  },
  {
    n: "05",
    title: "Reach out on the right channel",
    body: "Send personalised email or WhatsApp messages drafted from the lead's intelligence and your positioning.",
  },
  {
    n: "06",
    title: "Follow up systematically",
    body: "Reminders, activity log, and reply suggestions keep every conversation moving until it closes.",
  },
];

export default function GettingStarted() {
  const [tourOpen, setTourOpen] = useState(false);

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-10">
      {/* Hero */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
          <Rocket className="h-3.5 w-3.5" /> Getting Started
        </div>
        <h1 className="text-3xl md:text-4xl font-bold">How EngageIQ works</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          A seven-step workflow from defining your offer to closing follow-ups — built for B2B sales teams running personalised outbound at scale.
        </p>
        <div className="flex justify-center pt-2">
          <Button size="lg" onClick={() => setTourOpen(true)} className="gap-2">
            <Play className="h-4 w-4" /> Watch product tour
          </Button>
        </div>
      </div>

      {/* Workflow diagram */}
      <Card className="p-6 md:p-8 bg-gradient-to-br from-background to-muted/30">
        <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <PlayCircle className="h-5 w-5 text-primary" /> The workflow
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 items-stretch">
          {steps.map((s, i) => (
            <div key={s.n} className="relative">
              <Link
                to={s.to}
                className="block h-full p-4 rounded-xl border bg-card hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} text-white flex items-center justify-center mb-3 shadow-md`}
                >
                  <s.icon className="h-6 w-6" />
                </div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Step {s.n}
                </div>
                <div className="font-semibold text-sm mt-1">{s.title}</div>
                <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
              </Link>
              {i < steps.length - 1 && (
                <ArrowRight className="hidden xl:block absolute top-1/2 -right-3 -translate-y-1/2 h-5 w-5 text-muted-foreground/50 z-10" />
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* End-to-end flow */}
      <Card className="p-6 md:p-8">
        <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" /> End-to-end flow
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {flow.map((s) => (
            <div
              key={s.n}
              className="p-5 rounded-xl border bg-gradient-to-br from-muted/30 to-background"
            >
              <div className="text-xs font-bold text-primary tracking-wider mb-2">{s.n}</div>
              <div className="font-semibold text-sm">{s.title}</div>
              <p className="text-sm text-muted-foreground mt-1">{s.body}</p>
            </div>
          ))}
        </div>
      </Card>

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
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Recommended first session</h3>
          </div>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal pl-5">
            <li>Pick one account in <Link to="/app/targets" className="text-primary underline">Targets</Link></li>
            <li>Claim it to convert it into a lead</li>
            <li>Open <Link to="/app/intelligence" className="text-primary underline">AI Intelligence</Link> and review the brief</li>
            <li>Click "Suggest reply" and send your first personalised message</li>
          </ol>
        </Card>
      </div>

      {/* Product tour dialog */}
      <Dialog open={tourOpen} onOpenChange={setTourOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-primary" /> Product tour
            </DialogTitle>
          </DialogHeader>
          <div className="aspect-video w-full rounded-lg overflow-hidden bg-muted">
            <iframe
              className="w-full h-full"
              src="https://www.youtube.com/embed/dQw4w9WgXcQ"
              title="EngageIQ product tour"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Prefer a guided walk-through? <Link to="/app/help" className="text-primary underline" onClick={() => setTourOpen(false)}>Open the Help Center</Link> or <Link to="/app/support" className="text-primary underline" onClick={() => setTourOpen(false)}>chat with support</Link>.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
