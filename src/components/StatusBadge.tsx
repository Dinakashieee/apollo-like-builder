import { cn } from "@/lib/utils";
import type { LeadStatus } from "@/data/leads";
import { Flame, Sparkles, Snowflake } from "lucide-react";

interface StatusBadgeProps {
  status: LeadStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = {
    Hot: {
      icon: Flame,
      classes: "bg-hot/15 text-hot border-hot/30",
    },
    Warm: {
      icon: Sparkles,
      classes: "bg-warm/15 text-warm border-warm/30",
    },
    Cold: {
      icon: Snowflake,
      classes: "bg-cold/15 text-cold border-cold/30",
    },
  }[status];

  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border",
        config.classes,
        className
      )}
    >
      <Icon className="h-3 w-3" strokeWidth={2.5} />
      {status}
    </span>
  );
}
