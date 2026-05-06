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
} from "lucide-react";

const steps = [
  {
    n: 1,
    title: "Add your leads",
    desc: "Type or upload the people you want to talk to.",
    icon: Users,
    to: "/app/leads",
    color: "from-blue-500 to-cyan-500",
  },
  {
    n: 2,
    title: "Let AI read them",
    desc: "Our robot brain figures out what each person likes.",
    icon: Sparkles,
    to: "/app/intelligence",
    color: "from-fuchsia-500 to-purple-500",
  },
  {
    n: 3,
    title: "Send a friendly email",
    desc: "Pick a lead and write (or auto-write) a reply.",
    icon: Mail,
    to: "/app/composer",
    color: "from-amber-500 to-orange-500",
  },
  {
    n: 4,
    title: "Chat on WhatsApp",
    desc: "Open a lead → WhatsApp tab → suggest reply → send.",
    icon: MessageCircle,
    to: "/app/leads",
    color: "from-green-500 to-emerald-500",
  },
  {
    n: 5,
    title: "Never forget a follow-up",
    desc: "If a customer says “call me on the 25th”, we remind you.",
    icon: Bell,
    to: "/app/reminders",
    color: "from-rose-500 to-pink-500",
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
        <h1 className="text-3xl md:text-4xl font-bold">Welcome! Here's how it works 👋</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Five tiny steps. No tech words. If you can send a text message, you can use this app.
        </p>
      </div>

      {/* Diagram */}
      <Card className="p-6 md:p-8 bg-gradient-to-br from-background to-muted/30">
        <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <PlayCircle className="h-5 w-5 text-primary" /> How it works (in pictures)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-stretch">
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
                <ArrowRight className="hidden md:block absolute top-1/2 -right-3 -translate-y-1/2 h-5 w-5 text-muted-foreground/50 z-10" />
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Where to get help */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-6 space-y-3">
          <div className="flex items-center gap-2">
            <LifeBuoy className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Stuck? Get help</h3>
          </div>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>• <strong>Help Center</strong> — answers to common questions</li>
            <li>• <strong>Support</strong> — message a real human on our team</li>
            <li>• <strong>Email us</strong> — we usually reply within a few hours</li>
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
            <h3 className="font-semibold">Quick wins for today</h3>
          </div>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal pl-5">
            <li>Add 1 lead in <Link to="/app/leads" className="text-primary underline">Leads</Link></li>
            <li>Click "Suggest reply" inside the conversation</li>
            <li>Try "Detect follow-up date" on any received email</li>
            <li>Schedule a reply for tomorrow morning ☕</li>
          </ol>
        </Card>
      </div>
    </div>
  );
}
