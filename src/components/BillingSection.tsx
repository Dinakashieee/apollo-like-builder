import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { usePaddleCheckout } from "@/hooks/usePaddleCheckout";
import { supabase } from "@/integrations/supabase/client";
import { getPaddleEnvironment } from "@/lib/paddle";
import { toast } from "sonner";
import {
  CreditCard, ArrowUpRight, ArrowDownRight, Loader2, RotateCcw, Wallet, RefreshCw, AlertTriangle,
} from "lucide-react";

const TIER_LABELS: Record<string, string> = {
  starter_plan: "Starter",
  pro_plan: "Pro",
};

export function BillingSection() {
  const { user } = useAuth();
  const { subscription, isActive, tier, refetch } = useSubscription(user?.id);
  const { openCheckout } = usePaddleCheckout();
  const [busy, setBusy] = useState<string | null>(null);
  const [billing, setBilling] = useState<"month" | "year">("month");

  // After checkout success, poll for the subscription to appear (webhook
  // typically lands within a few seconds).
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("checkout") !== "success") return;
    url.searchParams.delete("checkout");
    window.history.replaceState({}, "", url.toString());

    toast.success("Payment received — activating your plan…");
    let tries = 0;
    const interval = setInterval(async () => {
      tries++;
      await refetch();
      if (subscription || tries >= 10) clearInterval(interval);
    }, 1500);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const subscribe = (priceId: string) => {
    if (!user) return;
    openCheckout({
      priceId,
      customerEmail: user.email ?? undefined,
      userId: user.id,
      successUrl: `${window.location.origin}/app/settings?checkout=success`,
    });
  };

  const callChange = async (newPriceId: string, label: string) => {
    setBusy(label);
    try {
      const { data, error } = await supabase.functions.invoke("change-plan", {
        body: { action: "change", newPriceId, environment: getPaddleEnvironment() },
      });
      if (error) throw error;
      toast.success(
        data?.scheduled
          ? "Change scheduled — takes effect at your next renewal."
          : "Plan updated. Charges are prorated."
      );
      setTimeout(refetch, 800);
    } catch {
      toast.error("Could not change plan. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const cancelPlan = async () => {
    if (!confirm("Cancel your subscription at the end of the current billing period?")) return;
    setBusy("cancel");
    try {
      const { error } = await supabase.functions.invoke("change-plan", {
        body: { action: "cancel", environment: getPaddleEnvironment() },
      });
      if (error) throw error;
      toast.success("Subscription will end at the end of your billing period.");
      setTimeout(refetch, 800);
    } catch {
      toast.error("Could not cancel. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const resumePlan = async () => {
    setBusy("resume");
    try {
      const { error } = await supabase.functions.invoke("manage-subscription", {
        body: { action: "resume", environment: getPaddleEnvironment() },
      });
      if (error) throw error;
      toast.success("Subscription resumed.");
      setTimeout(refetch, 800);
    } catch {
      toast.error("Could not resume. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const openPortal = async (target: "updatePayment" | "general") => {
    setBusy("portal");
    try {
      const { data, error } = await supabase.functions.invoke("manage-subscription", {
        body: { action: "portal", environment: getPaddleEnvironment() },
      });
      if (error) throw error;
      const url = data?.[target] ?? data?.general;
      if (!url) throw new Error("No portal URL");
      window.open(url, "_blank", "noopener");
    } catch {
      toast.error("Could not open billing portal. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const planLabel = subscription ? TIER_LABELS[subscription.product_id] ?? subscription.product_id : "Free";
  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString()
    : null;
  const currentInterval = subscription?.price_id?.endsWith("_yearly") ? "year" : "month";
  const altInterval = currentInterval === "year" ? "month" : "year";
  const isPastDue = subscription?.status === "past_due";

  return (
    <section className="bg-card border border-border/60 rounded-xl p-6 space-y-5">
      <div className="flex items-center gap-3">
        <CreditCard className="h-5 w-5 text-primary" />
        <h2 className="font-display font-bold text-lg">Billing & subscription</h2>
      </div>

      {isPastDue && (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm">
          <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-destructive">Your last payment failed.</p>
            <p className="text-muted-foreground">Update your payment method to avoid losing access.</p>
          </div>
          <Button size="sm" onClick={() => openPortal("updatePayment")} disabled={busy === "portal"}>
            Update card
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-baseline gap-3 pb-4 border-b border-border/60">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Current plan</p>
          <p className="text-2xl font-display font-bold text-primary-deep">{planLabel}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Status</p>
          <p className="text-sm font-medium capitalize">
            {isActive ? subscription?.status ?? "free" : "free"}
            {subscription?.cancel_at_period_end && " (ends soon)"}
          </p>
          {periodEnd && isActive && (
            <p className="text-xs text-muted-foreground">
              {subscription?.cancel_at_period_end ? "Ends" : "Renews"} on {periodEnd}
            </p>
          )}
        </div>
      </div>

      {!isActive && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm text-muted-foreground">Billed</span>
            <button
              onClick={() => setBilling("month")}
              className={`text-xs px-2.5 py-1 rounded-md ${billing === "month" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("year")}
              className={`text-xs px-2.5 py-1 rounded-md ${billing === "year" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              Annual <span className="ml-1 opacity-70">save 20%</span>
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => subscribe(billing === "year" ? "starter_yearly" : "starter_monthly")}>
              Subscribe to Starter ({billing === "year" ? "$38/yr" : "$4/mo"})
            </Button>
            <Button className="bg-gradient-primary shadow-glow" onClick={() => subscribe(billing === "year" ? "pro_yearly" : "pro_monthly")}>
              Subscribe to Pro ({billing === "year" ? "$374/yr" : "$39/mo"})
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Card required. You'll be charged immediately and billing continues until you cancel — cancel anytime from billing.
          </p>
        </div>
      )}

      {isActive && (
        <div className="flex flex-wrap gap-2">
          {tier === "starter" && (
            <Button onClick={() => callChange(currentInterval === "year" ? "pro_yearly" : "pro_monthly", "upgrade")} disabled={!!busy}>
              {busy === "upgrade" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ArrowUpRight className="h-4 w-4 mr-2" />}
              Upgrade to Pro
            </Button>
          )}
          {tier === "pro" && !subscription?.cancel_at_period_end && (
            <Button variant="outline" onClick={() => callChange(currentInterval === "year" ? "starter_yearly" : "starter_monthly", "downgrade")} disabled={!!busy}>
              <ArrowDownRight className="h-4 w-4 mr-2" /> Downgrade to Starter
            </Button>
          )}

          {/* Switch billing interval */}
          {!subscription?.cancel_at_period_end && (
            <Button
              variant="outline"
              onClick={() => callChange(`${tier}_${altInterval === "year" ? "yearly" : "monthly"}`, "interval")}
              disabled={!!busy}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Switch to {altInterval === "year" ? "annual" : "monthly"}
            </Button>
          )}

          <Button variant="outline" onClick={() => openPortal("updatePayment")} disabled={!!busy}>
            <Wallet className="h-4 w-4 mr-2" /> Update payment method
          </Button>

          {subscription?.cancel_at_period_end ? (
            <Button onClick={resumePlan} disabled={!!busy} className="bg-gradient-primary">
              {busy === "resume" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
              Resume subscription
            </Button>
          ) : (
            <Button variant="ghost" onClick={cancelPlan} disabled={!!busy} className="text-destructive">
              Cancel subscription
            </Button>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Upgrades are prorated immediately; downgrades take effect at your next renewal. Local taxes added at checkout where required.
      </p>
    </section>
  );
}
