import { cn } from "@/lib/utils";
import type { Lead } from "@/data/leads";

interface AvatarBubbleProps {
  lead: Pick<Lead, "initials" | "color" | "name">;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function AvatarBubble({ lead, size = "md", className }: AvatarBubbleProps) {
  const sizes = {
    sm: "h-7 w-7 text-[10px]",
    md: "h-9 w-9 text-xs",
    lg: "h-11 w-11 text-sm",
  };

  return (
    <div
      className={cn(
        "rounded-full bg-gradient-to-br flex items-center justify-center text-white font-semibold shrink-0 ring-2 ring-background shadow-soft",
        lead.color,
        sizes[size],
        className
      )}
      title={lead.name}
    >
      {lead.initials}
    </div>
  );
}
