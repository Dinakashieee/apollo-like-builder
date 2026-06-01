import { useState } from "react";
import { Zap, History } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEntitlements } from "@/hooks/useEntitlements";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { CreditHistoryDialog } from "@/components/CreditHistoryDialog";

export function CreditsPill() {
  const navigate = useNavigate();
  const { aiEmailsUsed, aiEmailsLimit, aiEmailsAtLimit, aiEmailsNearLimit, tier, loading } =
    useEntitlements();
  const [historyOpen, setHistoryOpen] = useState(false);

  if (loading) return null;

  const unlimited = !isFinite(aiEmailsLimit);
  const remaining = unlimited ? Infinity : Math.max(0, aiEmailsLimit - aiEmailsUsed);

  const tone = aiEmailsAtLimit
    ? "bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/15"
    : aiEmailsNearLimit
    ? "bg-amber-500/10 text-amber-700 border-amber-500/30 hover:bg-amber-500/15 dark:text-amber-400"
    : "bg-primary/10 text-primary border-primary/20 hover:bg-primary/15";

  const label = unlimited ? "Unlimited" : `${remaining}`;

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setHistoryOpen(true)}
            className={cn(
              "h-9 px-3 rounded-full border flex items-center gap-1.5 text-xs font-semibold transition-colors",
              tone
            )}
          >
            <Zap className="h-3.5 w-3.5" />
            <span>{label}</span>
            <span className="text-[10px] font-medium opacity-70 hidden sm:inline">credits</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end">
          <div className="text-xs space-y-1">
            <p className="font-semibold capitalize">{tier} plan</p>
            {unlimited ? (
              <p>Unlimited AI credits this month</p>
            ) : (
              <>
                <p>{aiEmailsUsed} of {aiEmailsLimit} credits used this month</p>
                <p className="text-muted-foreground">
                  Each AI email generation uses 1 credit. Resets monthly.
                </p>
              </>
            )}
            {aiEmailsAtLimit && (
              <p className="text-destructive font-medium pt-1">
                Limit reached —{" "}
                <button
                  className="underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate("/app/settings");
                  }}
                >
                  upgrade
                </button>{" "}
                for more.
              </p>
            )}
            <p className="flex items-center gap-1 text-muted-foreground pt-1 border-t border-border/50 mt-1">
              <History className="h-3 w-3" /> Click to view audit history
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
      <CreditHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} />
    </>
  );
}
