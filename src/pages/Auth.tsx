import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Logo } from "@/components/Logo";
import { Sparkles, Mail, Lock, User as UserIcon, ShieldCheck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Name is too short").max(80),
  email: z.string().trim().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});
const signInSchema = z.object({
  email: z.string().trim().email("Invalid email"),
  password: z.string().min(1, "Password required").max(72),
});

export default function Auth() {
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [complianceAck, setComplianceAck] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();

  const from = (location.state as any)?.from || "/app";

  useEffect(() => {
    if (!loading && user) navigate(from, { replace: true });
  }, [user, loading, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "forgot") {
        const emailParsed = z.string().trim().email("Invalid email").safeParse(email);
        if (!emailParsed.success) {
          toast({ title: "Invalid email", description: emailParsed.error.errors[0].message, variant: "destructive" });
          return;
        }
        const { error } = await supabase.auth.resetPasswordForEmail(emailParsed.data, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast({
          title: "Check your inbox",
          description: "We sent you a link to reset your password.",
        });
        setMode("signin");
      } else if (mode === "signup") {
        const parsed = signUpSchema.safeParse({ fullName, email, password });
        if (!parsed.success) {
          toast({ title: "Invalid input", description: parsed.error.errors[0].message, variant: "destructive" });
          return;
        }
        if (!complianceAck) {
          toast({
            title: "Please acknowledge the compliance terms",
            description: "You must agree to follow anti-spam and data-protection laws to use EngageIQ.",
            variant: "destructive",
          });
          return;
        }
        const redirectUrl = `${window.location.origin}/app`;
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: redirectUrl,
            data: { full_name: parsed.data.fullName },
          },
        });
        if (error) throw error;
        // Fire-and-forget welcome email (idempotent per email)
        supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "welcome",
            recipientEmail: parsed.data.email,
            idempotencyKey: `welcome-${parsed.data.email.toLowerCase()}`,
            templateData: { name: parsed.data.fullName },
          },
        }).catch(() => {});
        toast({ title: "Welcome to EngageIQ!", description: "Account created." });
      } else {
        const parsed = signInSchema.safeParse({ email, password });
        if (!parsed.success) {
          toast({ title: "Invalid input", description: parsed.error.errors[0].message, variant: "destructive" });
          return;
        }
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      toast({
        title: "Authentication error",
        description: err?.message ?? "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <div className="min-h-screen flex bg-gradient-soft">
      <div className="hidden lg:flex flex-1 bg-gradient-deep text-primary-foreground p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-10" />
        <div className="relative">
          <Logo variant="light" />
        </div>
        <div className="relative space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-semibold">
            <Sparkles className="h-3 w-3" /> AI-powered revenue platform
          </div>
          <h2 className="text-4xl font-display font-bold leading-tight">
            Find the right opportunities. <br />
            <span className="text-primary-glow">Engage with precision.</span>
          </h2>
          <p className="text-primary-foreground/70 max-w-md">
            EngageIQ unifies prospecting, AI-powered outreach, and pipeline intelligence into one workflow.
          </p>
        </div>
        <p className="relative text-xs text-primary-foreground/50">© 2026 EngageIQ</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <Logo />
          </div>
          <h1 className="text-3xl font-display font-bold text-primary-deep mb-2">
            {mode === "signin" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset your password"}
          </h1>
          <p className="text-muted-foreground mb-8">
            {mode === "signin"
          ? "Sign in to your EngageIQ workspace."
              : mode === "signup"
              ? "Use any email — business or personal — to create an account."
              : "Enter your email and we'll send you a reset link."}
          </p>

          {mode !== "forgot" && (
            <>
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 mb-4 border-border/60"
                onClick={handleGoogle}
              >
                <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.22-4.74 3.22-8.32z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18A10.99 10.99 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.83z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A10.99 10.99 0 0 0 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/>
                </svg>
                Continue with Google
              </Button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/60" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">or continue with email</span>
                </div>
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <Label htmlFor="fullName">Full name</Label>
                <div className="relative mt-1">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your name"
                    className="pl-9 h-11"
                    required
                  />
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-9 h-11"
                  required
                />
              </div>
              {mode === "signup" && (
                <p className="text-xs text-muted-foreground mt-1">
                  Business or personal email — both are welcome.
                </p>
              )}
            </div>
            {mode !== "forgot" && (
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => setMode("forgot")}
                      className="text-xs text-primary font-semibold hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-9 h-11"
                    required
                  />
                </div>
              </div>
            )}
            {mode === "signup" && (
              <div className="rounded-md border border-border/60 bg-muted/30 p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Email compliance acknowledgement
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  EngageIQ is a B2B sales-enablement tool — not a bulk-mail platform. By creating an account you confirm that, when sending outreach, you will:
                </p>
                <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-0.5">
                  <li>Have a lawful basis (consent, legitimate interest, or existing relationship) for every contact</li>
                  <li>Include a clear <strong>unsubscribe link</strong> and your <strong>postal address</strong> in every email</li>
                  <li>Identify yourself accurately — no deceptive sender names or subject lines</li>
                  <li>Honour opt-out, access, and erasure requests promptly at your own cost</li>
                  <li>Comply with <strong>GDPR, UK GDPR, CAN-SPAM, CASL, PECR, CCPA, PIPEDA, LGPD</strong> and equivalent laws</li>
                  <li>Not send unsolicited bulk email, phishing, or messages to consumers (B2C)</li>
                </ul>
                <label className="flex items-start gap-2 pt-1 cursor-pointer">
                  <Checkbox
                    checked={complianceAck}
                    onCheckedChange={(v) => setComplianceAck(v === true)}
                    className="mt-0.5"
                  />
                  <span className="text-xs leading-relaxed">
                    I agree to follow these rules and accept the{" "}
                    <Link to="/terms" target="_blank" className="underline text-primary">Terms (§5 — user is the data controller)</Link>{" "}
                    and{" "}
                    <Link to="/privacy" target="_blank" className="underline text-primary">Privacy Notice</Link>.
                    I understand my account may be suspended for violations.
                  </span>
                </label>
              </div>
            )}
            <Button
              type="submit"
              disabled={submitting || (mode === "signup" && !complianceAck)}
              className="w-full h-11 bg-gradient-primary shadow-glow"
            >
              {submitting
                ? "Please wait..."
                : mode === "signin"
                ? "Sign in"
                : mode === "signup"
                ? "Create account"
                : "Send reset link"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "forgot" ? (
              <>
                Remembered it?{" "}
                <button
                  onClick={() => setMode("signin")}
                  className="text-primary font-semibold hover:underline"
                >
                  Back to sign in
                </button>
              </>
            ) : (
              <>
                {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
                <button
                  onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                  className="text-primary font-semibold hover:underline"
                >
                  {mode === "signin" ? "Sign up" : "Sign in"}
                </button>
              </>
            )}
          </p>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground">← Back to homepage</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
