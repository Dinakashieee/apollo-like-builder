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
  DialogTrigger,
} from "@/components/ui/dialog";

const steps = [
  {
    n: 1,
    title: "Tell us about your company",
    desc: "Like show-and-tell! Add what you sell so our robot knows your toys.",
    icon: Building2,
    to: "/app/company",
    color: "from-slate-500 to-slate-700",
  },
  {
    n: 2,
    title: "Find people to talk to",
    desc: "Our robot looks at big lists (like Apps Run The World) and finds companies that might love your stuff.",
    icon: Target,
    to: "/app/targets",
    color: "from-indigo-500 to-blue-600",
  },
  {
    n: 3,
    title: "Add your leads",
    desc: "Pick the people you want to chat with. Type them in or upload a list.",
    icon: Users,
    to: "/app/leads",
    color: "from-blue-500 to-cyan-500",
  },
  {
    n: 4,
    title: "Let the robot brain learn them",
    desc: "AI Intelligence reads each lead and tells you what they care about — like a friend whispering tips.",
    icon: Brain,
    to: "/app/intelligence",
    color: "from-fuchsia-500 to-purple-500",
  },
  {
    n: 5,
    title: "Send a friendly email",
    desc: "Pick a lead and write (or auto-write) a sweet reply.",
    icon: Mail,
    to: "/app/composer",
    color: "from-amber-500 to-orange-500",
  },
  {
    n: 6,
    title: "Chat on WhatsApp",
    desc: "Open a lead → WhatsApp tab → suggest reply → send. Easy peasy.",
    icon: MessageCircle,
    to: "/app/leads",
    color: "from-green-500 to-emerald-500",
  },
  {
    n: 7,
    title: "Never forget a follow-up",
    desc: 'If someone says "call me on the 25th", we tap your shoulder that day.',
    icon: Bell,
    to: "/app/reminders",
    color: "from-rose-500 to-pink-500",
  },
];

const story = [
  {
    emoji: "🧸",
    title: "Once upon a time…",
    body: "You had cool stuff to sell, but you didn't know who would like it.",
  },
  {
    emoji: "🔭",
    title: "So our robot grabbed a telescope",
    body: "It peeked at Targets & Competitors and made a list of companies that fit you. It even told you which competitor they use today!",
  },
  {
    emoji: "📒",
    title: "You wrote names in your notebook (Leads)",
    body: "These are the people you want to be friends with.",
  },
  {
    emoji: "🧠",
    title: "The robot read their minds (almost)",
    body: "AI Intelligence figured out what each lead likes, their job, and the best way to talk to them.",
  },
  {
    emoji: "💌",
    title: "You sent a nice note",
    body: "Email or WhatsApp — the robot helped you pick the kindest words.",
  },
  {
    emoji: "⏰",
    title: "And lived happily ever after",
    body: "Reminders make sure you never forget to follow up. The end!",
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
        <h1 className="text-3xl md:text-4xl font-bold">Welcome! Here's how it works 👋</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Seven tiny steps. No tech words. If you can send a text message, you can use this app.
        </p>
        <div className="flex justify-center pt-2">
          <Button size="lg" onClick={() => setTourOpen(true)} className="gap-2">
            <Play className="h-4 w-4" /> Take a live product tour
          </Button>
        </div>
      </div>

      {/* Diagram */}
      <Card className="p-6 md:p-8 bg-gradient-to-br from-background to-muted/30">
        <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <PlayCircle className="h-5 w-5 text-primary" /> How it works (in pictures)
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

      {/* Storybook */}
      <Card className="p-6 md:p-8">
        <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" /> The story (read it like a bedtime tale)
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {story.map((s, i) => (
            <div
              key={i}
              className="p-5 rounded-xl border bg-gradient-to-br from-muted/30 to-background"
            >
              <div className="text-3xl mb-2">{s.emoji}</div>
              <div className="font-semibold text-sm">{s.title}</div>
              <p className="text-sm text-muted-foreground mt-1">{s.body}</p>
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
            <li>Pick 1 target in <Link to="/app/targets" className="text-primary underline">Targets</Link></li>
            <li>Claim it → it becomes a lead</li>
            <li>Open <Link to="/app/intelligence" className="text-primary underline">AI Intelligence</Link> to learn about them</li>
            <li>Click "Suggest reply" and send a friendly note ☕</li>
          </ol>
        </Card>
      </div>

      {/* Live product tour dialog */}
      <Dialog open={tourOpen} onOpenChange={setTourOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-primary" /> Live product tour
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
            Prefer a guided click-through? <Link to="/app/help" className="text-primary underline" onClick={() => setTourOpen(false)}>Open the Help Center</Link> or <Link to="/app/support" className="text-primary underline" onClick={() => setTourOpen(false)}>chat with support</Link>.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
