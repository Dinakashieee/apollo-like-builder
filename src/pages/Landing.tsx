import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Sparkles,
  Zap,
  Target,
  Mail,
  BarChart3,
  Shield,
  CheckCircle2,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { WaitlistDialog } from "@/components/WaitlistDialog";
import heroBg from "@/assets/hero-bg.jpg";

const features = [
  {
    icon: Sparkles,
    title: "AI Deal Intelligence",
    desc: "Score every account on intent, fit, and timing — automatically enriched from 60+ data sources.",
  },
  {
    icon: Mail,
    title: "Smart Email Composer",
    desc: "Generate personalized outreach in seconds with brand voice and context-aware suggestions.",
  },
  {
    icon: Zap,
    title: "Multi-Step Automation",
    desc: "Build sequences that adapt to replies, opens, and signals — without lifting a finger.",
  },
  {
    icon: Target,
    title: "Lead Management",
    desc: "Unified inbox for hot, warm, and cold leads with smart filters and team assignments.",
  },
  {
    icon: BarChart3,
    title: "Pipeline Analytics",
    desc: "Real-time conversion across every funnel stage. See what's moving — and what's stuck.",
  },
  {
    icon: Shield,
    title: "Enterprise Ready",
    desc: "SOC 2 compliant, SAML SSO, granular permissions, and full audit logs.",
  },
];

const logos = ["Apollo", "Outreach", "Salesloft", "Gong", "Clay", "HubSpot"];

export default function Landing() {
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background">
      <WaitlistDialog open={waitlistOpen} onOpenChange={setWaitlistOpen} />
      {/* Nav */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="container mx-auto h-16 flex items-center justify-between">
          <Logo />
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-foreground/80">
            <a href="#features" className="hover:text-primary transition-colors">Features</a>
            <a href="#preview" className="hover:text-primary transition-colors">Product</a>
            <a href="#pricing" className="hover:text-primary transition-colors">Pricing</a>
            <a href="#customers" className="hover:text-primary transition-colors">Customers</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth" className="hidden sm:inline-flex">
              <Button variant="ghost" size="sm" className="text-sm">Sign in</Button>
            </Link>
            <Button
              size="sm"
              className="bg-gradient-primary shadow-glow"
              onClick={() => setWaitlistOpen(true)}
            >
              Join waitlist <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div
          className="absolute inset-0 bg-gradient-hero"
          aria-hidden
        />
        <div className="absolute inset-0 grid-pattern opacity-40" aria-hidden />
        <div
          className="absolute top-0 right-0 w-[600px] h-[600px] opacity-30 mix-blend-multiply pointer-events-none"
          style={{
            backgroundImage: `url(${heroBg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            maskImage: "radial-gradient(ellipse at center, black 20%, transparent 70%)",
          }}
          aria-hidden
        />

        <div className="container relative mx-auto px-6 text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary mb-6 animate-fade-in">
            <Sparkles className="h-3 w-3" />
            New · AI Deal Intelligence is now live
            <ArrowRight className="h-3 w-3" />
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-display font-bold tracking-tight text-primary-deep leading-[1.05] animate-fade-up">
            The revenue platform for{" "}
            <span className="gradient-text">modern sales teams</span>
          </h1>

          <p
            className="mt-6 text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-fade-up"
            style={{ animationDelay: "120ms" }}
          >
            EngageIQ unifies prospecting, AI-powered outreach, and pipeline intelligence
            into one workflow. Find your best-fit accounts, write better emails, and close
            faster — all in one place.
          </p>

          <div
            className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-up"
            style={{ animationDelay: "240ms" }}
          >
            <Button
              size="lg"
              className="bg-gradient-primary shadow-glow h-12 px-7 text-base"
              onClick={() => setWaitlistOpen(true)}
            >
              Join the waitlist <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-7 text-base border-border/60">
              Watch 2-min demo
            </Button>
          </div>

          <div
            className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground animate-fade-up"
            style={{ animationDelay: "360ms" }}
          >
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-success" /> Free 14-day trial</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-success" /> No credit card</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-success" /> Cancel anytime</span>
          </div>
        </div>

        {/* Product preview card */}
        <div
          id="preview"
          className="container relative mx-auto px-6 mt-16 animate-fade-up"
          style={{ animationDelay: "480ms" }}
        >
          <div className="relative max-w-5xl mx-auto">
            <div className="absolute -inset-x-8 -top-8 h-40 bg-gradient-primary opacity-20 blur-3xl rounded-full" aria-hidden />
            <div className="relative card-elevated overflow-hidden border border-border/60 shadow-elevated">
              {/* Window chrome */}
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border/60 bg-muted/30">
                <div className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-hot/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-success/60" />
                <span className="ml-3 text-[11px] text-muted-foreground font-medium">app.engageiq.com</span>
              </div>
              {/* Mini dashboard */}
              <div className="p-6 lg:p-8 bg-gradient-soft">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-display font-bold text-lg text-primary-deep">Sales Dashboard</h3>
                  <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-1 rounded-md">LIVE</span>
                </div>
                <div className="grid grid-cols-4 gap-3 mb-5">
                  {[
                    { l: "Total Leads", v: "320" },
                    { l: "Hot Leads", v: "48" },
                    { l: "Open Rate", v: "71%" },
                    { l: "Closed", v: "25%" },
                  ].map((k) => (
                    <div key={k.l} className="bg-card border border-border/60 rounded-xl p-3">
                      <p className="text-[10px] text-muted-foreground font-medium">{k.l}</p>
                      <p className="text-xl font-display font-bold text-primary-deep">{k.v}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-end gap-2 h-32">
                  {[80, 65, 90, 55, 75, 95, 70, 85].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t-md bg-gradient-to-t from-primary to-primary-glow opacity-90"
                      style={{ height: `${h}%`, animationDelay: `${i * 50}ms` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logo strip */}
      <section className="py-12 border-y border-border/60 bg-card/30">
        <div className="container mx-auto px-6">
          <p className="text-center text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-6">
            Trusted by 4,000+ revenue teams worldwide
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
            {logos.map((l) => (
              <span key={l} className="text-2xl font-display font-bold text-foreground/30 hover:text-foreground/60 transition-colors">
                {l}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24">
        <div className="container mx-auto px-6">
          <div className="max-w-2xl mx-auto text-center mb-16">
            <p className="text-sm font-semibold text-primary mb-3 uppercase tracking-wider">Everything you need</p>
            <h2 className="text-4xl lg:text-5xl font-display font-bold text-primary-deep tracking-tight">
              One platform for the entire revenue motion
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              Replace 6 tools with one. EngageIQ brings your data, your messaging,
              and your pipeline together.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="card-elevated p-6 hover:shadow-elevated hover:-translate-y-1 transition-all duration-300 group"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="h-11 w-11 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow mb-4 group-hover:scale-110 transition-transform">
                  <f.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <h3 className="font-display font-bold text-lg text-primary-deep mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section id="customers" className="py-24 bg-gradient-deep text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-10" />
        <div className="container relative mx-auto px-6 max-w-4xl text-center">
          <div className="flex justify-center gap-1 mb-6">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-5 w-5 fill-hot text-hot" />
            ))}
          </div>
          <blockquote className="text-2xl lg:text-3xl font-display font-medium leading-relaxed">
            "EngageIQ replaced Apollo, Outreach, and our analytics stack.
            Our SDRs book <span className="text-primary-glow">3× more meetings</span>, and
            our pipeline visibility is finally real-time."
          </blockquote>
          <div className="mt-8 flex items-center justify-center gap-3">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-semibold">
              SK
            </div>
            <div className="text-left">
              <p className="font-semibold">Sarah Kim</p>
              <p className="text-sm text-primary-foreground/70">VP Sales · Helio Labs</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="pricing" className="py-24">
        <div className="container mx-auto px-6">
          <div className="card-elevated p-12 lg:p-16 text-center bg-gradient-soft border-2 border-primary/10 max-w-4xl mx-auto relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/20 blur-3xl rounded-full" />
            <h2 className="relative text-4xl lg:text-5xl font-display font-bold text-primary-deep tracking-tight">
              Start closing more deals today
            </h2>
            <p className="relative mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
              Join thousands of teams who trust EngageIQ to power their revenue engine.
            </p>
            <div className="relative mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                className="bg-gradient-primary shadow-glow h-12 px-8 text-base"
                onClick={() => setWaitlistOpen(true)}
              >
                Join the waitlist <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 text-base">
                Talk to sales
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 py-10 bg-card/30">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo />
          <p className="text-xs text-muted-foreground">
            © 2026 EngageIQ. Built for revenue teams who refuse to settle.
          </p>
          <div className="flex items-center gap-5 text-xs text-muted-foreground">
            <a href="#" className="hover:text-foreground">Privacy</a>
            <a href="#" className="hover:text-foreground">Terms</a>
            <a href="#" className="hover:text-foreground">Security</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
