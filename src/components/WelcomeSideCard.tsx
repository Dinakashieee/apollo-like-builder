import { X } from "lucide-react";
import { Link } from "react-router-dom";
import welcomePromoAsset from "@/assets/engageiq-welcome-promo.asset.json";

interface WelcomeSideCardProps {
  open: boolean;
  onClose: () => void;
  href?: string;
  linkLabel?: string;
}

export function WelcomeSideCard({ open, onClose, href, linkLabel }: WelcomeSideCardProps) {
  if (!open) return null;

  const image = (
    <img
      src={welcomePromoAsset.url}
      alt="EngageIQ.lk — Outperform in front of your sales management. AI account targeting, automated outreach, activity tracking, market intelligence and pipeline insights."
      className="block w-full"
    />
  );

  return (
    <aside
      role="dialog"
      aria-label="Welcome to EngageIQ.lk"
      className="fixed bottom-4 right-4 z-50 w-72 overflow-hidden rounded-xl border border-border/60 bg-background shadow-xl sm:w-[22rem]"
    >
      <div className="flex items-center justify-between border-b border-border/40 px-3 py-2">
        <span className="text-xs font-semibold tracking-wide text-foreground/90">Welcome 👋</span>
        <button
          type="button"
          aria-label="Close welcome"
          onClick={onClose}
          className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {href ? (
        <Link to={href} aria-label={linkLabel} onClick={onClose}>
          {image}
        </Link>
      ) : (
        image
      )}
    </aside>
  );
}
