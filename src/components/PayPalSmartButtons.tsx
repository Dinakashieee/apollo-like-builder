import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

let sdkPromise: Promise<void> | null = null;

function loadSdk(clientId: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if ((window as any).paypal?.Buttons) return Promise.resolve();
  if (sdkPromise) return sdkPromise;

  const src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
    clientId,
  )}&components=buttons,card-fields&enable-funding=card&disable-funding=venmo&currency=USD&intent=capture`;

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
  description?: string;
  onSuccess?: (details: any) => void;
}

export function PayPalSmartButtons({ amount = "4.00", description, onSuccess }: Props) {
  const buttonsRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const renderedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("paypal-config");
        if (error || !data?.clientId) throw new Error("Could not load PayPal config");
        await loadSdk(data.clientId);
        if (cancelled || renderedRef.current) return;
        const paypal = (window as any).paypal;
        if (!paypal) throw new Error("PayPal SDK not available");

        renderedRef.current = true;
        setLoading(false);

        const createOrder = async () => {
          const { data: order, error: err } = await supabase.functions.invoke(
            "paypal-create-order",
            { body: { amount, description } },
          );
          if (err || !order?.id) {
            toast.error("Could not start checkout. Please try again.");
            throw new Error("create order failed");
          }
          return order.id;
        };

        const onApprove = async (data: any) => {
          const { data: result, error: err } = await supabase.functions.invoke(
            "paypal-capture-order",
            { body: { orderId: data.orderID } },
          );
          if (err) {
            toast.error("Payment could not be completed.");
            return;
          }
          toast.success("Payment successful!");
          onSuccess?.(result);
        };

        // PayPal + funding-source buttons (includes card on supported regions)
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

        // Standalone advanced card fields (debit/credit) when eligible
        if (paypal.CardFields && cardRef.current) {
          const cardFields = paypal.CardFields({ createOrder, onApprove });
          if (cardFields.isEligible()) {
            cardFields.NumberField().render(`#paypal-card-number`);
            cardFields.ExpiryField().render(`#paypal-card-expiry`);
            cardFields.CVVField().render(`#paypal-card-cvv`);
            cardFields.NameField().render(`#paypal-card-name`);

            const submit = document.getElementById("paypal-card-submit");
            submit?.addEventListener("click", async () => {
              try {
                await cardFields.submit();
              } catch (e) {
                console.error("Card submit error", e);
                toast.error("Card payment failed. Please check your details.");
              }
            });
          } else {
            cardRef.current.style.display = "none";
          }
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
    <div className="space-y-3">
      {loading && <div className="text-xs text-muted-foreground">Loading payment options…</div>}
      {error && <div className="text-xs text-destructive">{error}</div>}
      <div ref={buttonsRef} />
      <div ref={cardRef} className="space-y-2">
        <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider pt-1">
          Or pay with debit / credit card
        </div>
        <div
          id="paypal-card-name"
          className="border border-border/60 rounded-md px-3 py-2 bg-background min-h-[40px]"
        />
        <div
          id="paypal-card-number"
          className="border border-border/60 rounded-md px-3 py-2 bg-background min-h-[40px]"
        />
        <div className="grid grid-cols-2 gap-2">
          <div
            id="paypal-card-expiry"
            className="border border-border/60 rounded-md px-3 py-2 bg-background min-h-[40px]"
          />
          <div
            id="paypal-card-cvv"
            className="border border-border/60 rounded-md px-3 py-2 bg-background min-h-[40px]"
          />
        </div>
        <button
          id="paypal-card-submit"
          type="button"
          className="w-full bg-primary text-primary-foreground rounded-md py-2 text-sm font-semibold hover:opacity-90"
        >
          Pay ${amount}
        </button>
      </div>
    </div>
  );
}
