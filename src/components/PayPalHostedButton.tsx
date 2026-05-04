import { useEffect, useRef } from "react";

const CLIENT_ID =
  "BAA15EZCLJNN2LRmyF6zXuACOOOFVB6bytVmF2G4BjFmJo3gL9xp5Fw4MbywxuesqiGL8tNjcW3ScN3jy4";
const SDK_SRC = `https://www.paypal.com/sdk/js?client-id=${CLIENT_ID}&components=hosted-buttons&disable-funding=venmo&currency=USD`;

let sdkPromise: Promise<void> | null = null;

function loadPayPalSdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if ((window as any).paypal?.HostedButtons) return Promise.resolve();
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SDK_SRC}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("PayPal SDK failed to load")));
      return;
    }
    const script = document.createElement("script");
    script.src = SDK_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("PayPal SDK failed to load"));
    document.head.appendChild(script);
  });

  return sdkPromise;
}

interface PayPalHostedButtonProps {
  hostedButtonId: string;
  className?: string;
}

export function PayPalHostedButton({ hostedButtonId, className }: PayPalHostedButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const renderedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    loadPayPalSdk()
      .then(() => {
        if (cancelled || renderedRef.current || !containerRef.current) return;
        const paypal = (window as any).paypal;
        if (!paypal?.HostedButtons) return;
        renderedRef.current = true;
        paypal
          .HostedButtons({ hostedButtonId })
          .render(`#paypal-container-${hostedButtonId}`);
      })
      .catch((err) => console.error("PayPal SDK load error:", err));
    return () => {
      cancelled = true;
    };
  }, [hostedButtonId]);

  return (
    <div
      ref={containerRef}
      id={`paypal-container-${hostedButtonId}`}
      className={className}
    />
  );
}
