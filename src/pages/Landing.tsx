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
  Check,
  Database,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { ChatWidget } from "@/components/ChatWidget";
import { LiveDashboardPreview } from "@/components/LiveDashboardPreview";
import { usePaddleCheckout } from "@/hooks/usePaddleCheckout";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
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
    icon: Database,
    title: "Bring Your Own Database",
    desc: "Connect your own Postgres or Supabase. Your leads, your data, your control — zero lock-in.",
  },
];

const trustedAvatars = [
  { initials: "AR", from: "from-rose-400", to: "to-pink-500" },
  { initials: "JM", from: "from-amber-400", to: "to-orange-500" },
  { initials: "PT", from: "from-emerald-400", to: "to-teal-500" },
  { initials: "SK", from: "from-sky-400", to: "to-indigo-500" },
  { initials: "LV", from: "from-violet-400", to: "to-purple-500" },
];

const ANNUAL_DISCOUNT = 0.2; // 20% off annual

type Tier = {
  name: string;
  tagline: string;
  monthly: number | null;
  cta: string;
  highlight: boolean;
  features: string[];
  priceMonthly?: string;
  priceYearly?: string;
  contact?: boolean;
};

const tiers: Tier[] = [
  {
    name: "Free",
    tagline: "Try EngageIQ — no commitment",
    monthly: 0,
    cta: "Get started free",
    highlight: false,
    features: [
      "10 leads",
      "25 AI emails / month",
      "Basic AI lead scoring",
      "1 user",
      "Bring Your Own Database (BYOD) supported",
      "Community support",
    ],
  },
  {
    name: "Starter",
    tagline: "For solo founders & small teams",
    monthly: 19,
    cta: "Subscribe to Starter",
    highlight: false,
    priceMonthly: "starter_monthly",
    priceYearly: "starter_yearly",
    features: [
      "1,000 leads",
      "2,500 AI emails / month",
      "Full AI deal intelligence",
      "3 users included",
      "1 automation sequence",
      "Bring Your Own Database (BYOD)",
      "Email support",
    ],
  },
  {
    name: "Growth",
    tagline: "For teams scaling outbound seriously",
    monthly: 39,
    cta: "Subscribe to Growth",
    highlight: true,
    priceMonthly: "growth_monthly",
    priceYearly: "growth_yearly",
    features: [
      "4,000 leads",
      "10,000 AI emails / month",
      "Advanced intent + fit scoring",
      "5 users included",
      "Unlimited automations",
      "Pipeline analytics",
      "Bring Your Own Database (BYOD)",
      "Priority email support",
    ],
  },
  {
    name: "Scale",
    tagline: "Unlimited everything · for power users",
    monthly: 79,
    cta: "Subscribe to Scale",
    highlight: false,
    priceMonthly: "scale_monthly",
    priceYearly: "scale_yearly",
    features: [
      "Unlimited leads",
      "Unlimited AI emails",
      "10 users included",
      "Bring Your Own Database (BYOD) — recommended",
      "Bring your own AI keys (OpenAI, Anthropic)",
      "Priority queue + faster response times",
      "Add-ons available on request",
    ],
  },
];

export default function Landing() {
  const [annual, setAnnual] = useState(true);
  const { openCheckout, loading: checkoutLoading } = usePaddleCheckout();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleTierCta = (tier: Tier) => {
    if (tier.contact) {
      window.location.href = "mailto:sales@engageiqlk.com?subject=Enterprise%20inquiry";
      return;
    }
    if (tier.monthly === 0) {
      navigate(user ? "/app" : "/auth");
      return;
    }
    if (!user) {
      navigate("/auth?next=/#pricing");
      return;
    }
    const priceId = annual ? tier.priceYearly : tier.priceMonthly;
    if (!priceId) return;
    openCheckout({
      priceId,
      customerEmail: user.email ?? undefined,
      userId: user.id,
      successUrl: `${window.location.origin}/app?checkout=success`,
    });
  };

  const formatPrice = (monthly: number | null) => {
    if (monthly === null) return "Custom";
    if (monthly === 0) return "$0";
    const value = annual ? Math.round(monthly * (1 - ANNUAL_DISCOUNT)) : monthly;
    return `$${value}`;
  };
  return (
    <div className="min-h-screen bg-background">
      <PaymentTestModeBanner />

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
          <div className="flex items-center gap-1 sm:gap-2">
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="text-sm px-2 sm:px-3">Sign in</Button>
            </Link>
            <Button
              size="sm"
              className="bg-gradient-primary shadow-glow"
              onClick={() => navigate(user ? "/app" : "/auth")}
            >
              Get started <ArrowRight className="h-4 w-4 ml-1" />
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
            Stop sending bulk emails without context. EngageIQ tells you exactly which
            accounts match your company — and only prompts you to reach out when there's
            a real opportunity worth your time.
          </p>

          {/* BYOD highlight */}
          <div
            className="mt-7 inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 text-sm font-semibold text-emerald-700 dark:text-emerald-400 animate-fade-up"
            style={{ animationDelay: "180ms" }}
          >
            <Database className="h-4 w-4" />
            <span>Bring Your Own Database — your data never leaves your control</span>
          </div>

          <div
            className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-up"
            style={{ animationDelay: "240ms" }}
          >
            <Button
              size="lg"
              className="bg-gradient-primary shadow-glow h-12 px-7 text-base"
              onClick={() => navigate(user ? "/app" : "/auth")}
            >
              Get started free <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          <div
            className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground animate-fade-up"
            style={{ animationDelay: "360ms" }}
          >
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-success" /> Free plan available</span>
            <span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-success" /> Card secured by Paddle</span>
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
            <LiveDashboardPreview />
          </div>
        </div>
      </section>

      {/* Trusted strip */}
      <section className="py-12 border-y border-border/60 bg-card/30">
        <div className="container mx-auto px-6">
          <div className="flex flex-col items-center gap-4">
            <div className="flex -space-x-2">
              {trustedAvatars.map((a) => (
                <div
                  key={a.initials}
                  className={`h-10 w-10 rounded-full bg-gradient-to-br ${a.from} ${a.to} border-2 border-background flex items-center justify-center text-xs font-bold text-white shadow-sm`}
                >
                  {a.initials}
                </div>
              ))}
              <div className="h-10 w-10 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[11px] font-bold text-muted-foreground shadow-sm">
                +95
              </div>
            </div>
            <p className="text-center text-sm text-muted-foreground font-medium">
              Trusted by <span className="font-bold text-primary-deep">100+ individuals</span> across the world
            </p>
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-hot text-hot" />
              ))}
              <span className="ml-2 text-xs text-muted-foreground">Loved by early adopters</span>
            </div>
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
            "EngageIQ tells me <span className="text-primary-glow">exactly which 5 leads</span> to
            focus on each week. I stopped guessing — and started closing."
          </blockquote>
          <div className="mt-8 flex items-center justify-center gap-3">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-semibold">
              AR
            </div>
            <div className="text-left">
              <p className="font-semibold">Ananya R.</p>
              <p className="text-sm text-primary-foreground/70">Founder · Early adopter</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-gradient-soft">
        <div className="container mx-auto px-6">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <p className="text-sm font-semibold text-primary mb-3 uppercase tracking-wider">Pricing</p>
            <h2 className="text-4xl lg:text-5xl font-display font-bold text-primary-deep tracking-tight">
              Simple plans that scale with your team
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              Start free. Upgrade when you're ready. Cancel anytime.
            </p>

            {/* Billing toggle */}
            <div className="inline-flex items-center gap-1 mt-8 p-1 rounded-full border border-border/60 bg-card">
              <button
                onClick={() => setAnnual(false)}
                className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
                  !annual ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors flex items-center gap-2 ${
                  annual ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Annual
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  annual ? "bg-primary-foreground/20 text-primary-foreground" : "bg-success/10 text-success"
                }`}>
                  -20%
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-7xl mx-auto">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`relative rounded-2xl p-7 flex flex-col bg-card transition-all duration-300 hover:-translate-y-1 ${
                  tier.highlight
                    ? "border-2 border-primary shadow-elevated"
                    : "border border-border/60 shadow-sm hover:shadow-elevated"
                }`}
              >
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-gradient-primary text-primary-foreground px-3 py-1 rounded-full shadow-glow">
                      Most popular
                    </span>
                  </div>
                )}

                <div className="mb-5">
                  <h3 className="font-display font-bold text-xl text-primary-deep">{tier.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1 min-h-[40px]">{tier.tagline}</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-display font-bold text-primary-deep">
                      {formatPrice(tier.monthly)}
                    </span>
                    {tier.monthly !== null && tier.monthly > 0 && (
                      <span className="text-sm text-muted-foreground">/mo</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 h-4">
                    {tier.monthly === null
                      ? "Talk to sales for a custom quote"
                      : tier.monthly === 0
                        ? "Free forever"
                        : annual
                          ? `Billed annually ($${Math.round(tier.monthly * (1 - ANNUAL_DISCOUNT) * 12)}/yr)`
                          : "Billed monthly"}
                  </p>
                </div>

                <Button
                  className={`w-full mb-6 ${
                    tier.highlight ? "bg-gradient-primary shadow-glow" : ""
                  }`}
                  variant={tier.highlight ? "default" : "outline"}
                  onClick={() => handleTierCta(tier)}
                  disabled={checkoutLoading}
                >
                  {checkoutLoading && tier.monthly && tier.monthly > 0 ? "Opening checkout…" : tier.cta}
                </Button>

                <ul className="space-y-2.5 text-sm">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-foreground/80">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-muted-foreground mt-10 max-w-2xl mx-auto">
            Free plan is fully free — no card needed. Paid plans bill immediately and you can cancel anytime from billing.
            All plans support Bring Your Own Database. Local taxes added at checkout where required by law.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="card-elevated p-12 lg:p-16 text-center bg-gradient-soft border-2 border-primary/10 max-w-4xl mx-auto relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/20 blur-3xl rounded-full" />
            <h2 className="relative text-4xl lg:text-5xl font-display font-bold text-primary-deep tracking-tight">
              Start closing more deals today
            </h2>
            <p className="relative mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
              Join early adopters using EngageIQ to power their revenue engine — with full control of their data.
            </p>
            <div className="relative mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                className="bg-gradient-primary shadow-glow h-12 px-8 text-base"
                onClick={() => navigate(user ? "/app" : "/auth")}
              >
                Get started free <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-8 text-base"
                onClick={() => navigate(user ? "/app" : "/auth?next=/#pricing")}
              >
                See plans
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 py-10 bg-card/30">
        <div className="container mx-auto px-6 flex flex-col gap-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <Logo />
            <div className="flex items-center gap-5 text-xs text-muted-foreground">
              <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
              <Link to="/terms" className="hover:text-foreground">Terms</Link>
              <Link to="/refund" className="hover:text-foreground">Refund</Link>
              <a href="mailto:support@engageiqlk.com" className="hover:text-foreground">Support</a>
            </div>
          </div>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 text-xs text-muted-foreground border-t border-border/40 pt-6">
            <address className="not-italic leading-relaxed">
              <span className="font-semibold text-foreground">EngageIQ</span><br />
              <span className="font-medium text-foreground/90">HQ:</span> 275 New North Road, Islington #1772, London, N1 7AA, United Kingdom<br />
              <span className="font-medium text-foreground/90">R&amp;D:</span> Colombo 10350, Sri Lanka<br />
              <a href="tel:+94777263673" className="hover:text-foreground">+94 77 726 3673</a> · <a href="mailto:support@engageiqlk.com" className="hover:text-foreground underline-offset-2 hover:underline">support@engageiqlk.com</a>
            </address>
            <p>© 2026 EngageIQ. Built for revenue teams who refuse to settle.</p>
          </div>
        </div>
      </footer>
      <ChatWidget mode="support" />
    </div>
  );
}
