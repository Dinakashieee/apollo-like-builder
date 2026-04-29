import { useState } from "react";
import { initializePaddle, getPaddlePriceId } from "@/lib/paddle";
import { toast } from "sonner";

export function usePaddleCheckout() {
  const [loading, setLoading] = useState(false);

  const openCheckout = async (options: {
    priceId: string;
    customerEmail?: string;
    userId?: string;
    successUrl?: string;
  }) => {
    setLoading(true);
    try {
      await initializePaddle();
      const paddlePriceId = await getPaddlePriceId(options.priceId);

      window.Paddle.Checkout.open({
        items: [
          {
            priceId: paddlePriceId,
            quantity: 1,
            // 7-day free trial. Paddle will auto-charge the card on day 8
            // unless the customer cancels from the customer portal.
            trialPeriod: { interval: "day", frequency: 7 },
          },
        ],
        customer: options.customerEmail ? { email: options.customerEmail } : undefined,
        customData: options.userId ? { userId: options.userId } : undefined,
        settings: {
          displayMode: "overlay",
          successUrl: options.successUrl || `${window.location.origin}/app?checkout=success`,
          allowLogout: false,
          variant: "one-page",
        },
      });
    } catch (e) {
      console.error("Checkout failed:", e);
      toast.error("Could not open checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return { openCheckout, loading };
}
