import { MessageSquareText } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  variant?: "default" | "light";
  showText?: boolean;
  /** When true (default), the logo links to "/". Set false to render a non-clickable mark. */
  asLink?: boolean;
  /** Override the destination. Defaults to "/". */
  to?: string;
}

export function Logo({
  className,
  variant = "default",
  showText = true,
  asLink = true,
  to = "/",
}: LogoProps) {
  const content = (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
        <MessageSquareText className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
        <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-hot border-2 border-background" />
      </div>
      {showText && (
        <span
          className={cn(
            "font-display font-bold text-xl tracking-tight",
            variant === "light" ? "text-sidebar-foreground" : "text-foreground"
          )}
        >
          Engage<span className="text-primary">IQ</span>
        </span>
      )}
    </div>
  );

  if (!asLink) return content;

  return (
    <Link
      to={to}
      aria-label="EngageIQ — Home"
      className="inline-flex outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl transition-opacity hover:opacity-90"
    >
      {content}
    </Link>
  );
}
