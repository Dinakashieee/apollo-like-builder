import { ReactNode } from "react";
import PublicLandingPage from "@/pages/PublicLandingPage";

// Hosts that always run the full app (auth, dashboard, etc.)
const APP_HOST_SUFFIXES = [
  "engageiqlk.com",
  "engageiqlk.lovable.app",
  "lovable.app",
  "lovable.dev",
  "localhost",
  "127.0.0.1",
];

export function isAppHost(host: string) {
  const h = host.toLowerCase();
  return APP_HOST_SUFFIXES.some((s) => h === s || h.endsWith("." + s) || h.endsWith(s));
}

/**
 * If the current hostname is NOT one of our app hosts (i.e. a customer's
 * custom domain pointing at us), render the public landing page resolved
 * by Host header — bypass the rest of the SPA entirely.
 */
export function CustomDomainGate({ children }: { children: ReactNode }) {
  if (typeof window === "undefined") return <>{children}</>;
  if (isAppHost(window.location.hostname)) return <>{children}</>;
  return <PublicLandingPage byHost />;
}
