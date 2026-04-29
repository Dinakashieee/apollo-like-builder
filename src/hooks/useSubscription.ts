import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getPaddleEnvironment } from "@/lib/paddle";

export type Subscription = {
  id: string;
  user_id: string;
  paddle_subscription_id: string;
  product_id: string;
  price_id: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  environment: string;
};

export function useSubscription(userId: string | undefined) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSub = async () => {
    if (!userId) {
      setSubscription(null);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("environment", getPaddleEnvironment())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setSubscription(data as Subscription | null);
    setLoading(false);
  };

  useEffect(() => {
    fetchSub();
    if (!userId) return;
    const topic = `subs:${userId}:${Math.random().toString(36).slice(2, 10)}`;
    const channel = supabase.channel(topic);
    channel
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${userId}` },
        () => fetchSub()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const isActive =
    !!subscription &&
    ((["active", "trialing", "past_due"].includes(subscription.status) &&
      (!subscription.current_period_end || new Date(subscription.current_period_end) > new Date())) ||
      (subscription.status === "canceled" &&
        subscription.current_period_end != null &&
        new Date(subscription.current_period_end) > new Date()));

  const tier: "free" | "starter" | "growth" | "pro" =
    !isActive
      ? "free"
      : subscription?.product_id === "scale_plan"
      ? "pro"
      : subscription?.product_id === "growth_plan"
      ? "growth"
      : subscription?.product_id === "pro_plan"
      ? "pro"
      : "starter";

  return { subscription, loading, isActive, tier, refetch: fetchSub };
}
