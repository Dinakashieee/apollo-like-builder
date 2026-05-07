import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

let sdkPromise: Promise<void> | null = null;

function loadSdk(clientId: string, currency: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if ((window as any).paypal?.Buttons) return Promise.resolve();
  if (sdkPromise) return sdkPromise;

  // Smart Buttons include a "Debit or Credit Card" button automatically
  // (no special PayPal account approval needed, unlike Advanced Card Fields).
  const src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
    clientId,
  )}&components=buttons&enable-funding=venmo,paylater,card&currency=${encodeURIComponent(currency)}&intent=capture`;

  sdkPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-paypal-sdk="1"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("PayPal SDK failed")));
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.dataset.paypalSdk = "1";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("PayPal SDK failed"));
    document.head.appendChild(s);
  });
  return sdkPromise;
}

interface Props {
  amount?: string;
  currency?: string;
  description?: string;
  onSuccess?: (details: any) => void;
}

export function PayPalSmartButtons({ amount = "1.00", currency = "USD", description, onSuccess }: Props) {
  const buttonsRef = useRef<HTMLDivElement>(null);
  const renderedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("paypal-config");
        if (error || !data?.clientId) throw new Error("Could not load PayPal config");
        await loadSdk(data.clientId, currency);
        if (cancelled || renderedRef.current) return;
        const paypal = (window as any).paypal;
        if (!paypal?.Buttons) throw new Error("PayPal SDK not available");

        renderedRef.current = true;
        setLoading(false);

        const createOrder = async () => {
          const { data: order, error: err } = await supabase.functions.invoke(
            "paypal-create-order",
            { body: { amount, currency, description } },
          );
          if (err || !order?.id) {
            toast.error("Could not start checkout. Please try again.");
            throw new Error("create order failed");
          }
          return order.id;
        };

        const onApprove = async (data: any, actions: any) => {
          const { data: result, error: err } = await supabase.functions.invoke(
            "paypal-capture-order",
            { body: { orderId: data.orderID } },
          );
          if (err) {
            toast.error("Payment could not be completed.");
            return;
          }
          if (result?.ok === false) {
            toast.error(result.message ?? "Payment could not be completed.");
            if (result.recoverable && actions?.restart) return actions.restart();
            return;
          }
          toast.success("Payment successful!");
          onSuccess?.(result);
        };

        if (buttonsRef.current) {
          paypal
            .Buttons({
              style: { layout: "vertical", shape: "rect", label: "pay" },
              createOrder,
              onApprove,
              onError: (err: any) => {
                console.error("PayPal button error", err);
                toast.error("Payment error. Please try again.");
              },
            })
            .render(buttonsRef.current);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "PayPal failed to load");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [amount, description, onSuccess]);

  return (
    <div className="space-y-2">
      {loading && <div className="text-xs text-muted-foreground">Loading payment options…</div>}
      {error && <div className="text-xs text-destructive">{error}</div>}
      <div ref={buttonsRef} />
      <p className="text-[11px] text-muted-foreground text-center">
        Pay with PayPal or debit / credit card.
      </p>
    </div>
  );
}
