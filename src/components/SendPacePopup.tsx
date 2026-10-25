import { useEffect, useState } from "react";
import { Coffee, Gauge, Mail } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useEmailSendingState } from "@/hooks/useEmailSendingState";
import {
  BREAK_MIN,
  DAILY_HEALTHY_LIMIT,
  PACE_EVENT,
  paceAdvice,
} from "@/lib/sendPace";

type NudgeDetail = { sent: number; recent: number };

/**
 * Popup shown when the user is sending faster than the healthy pace.
 * Mounted once in the app layout; reacts to the send-pace event.
 */
export function SendPacePopup() {
  const [nudge, setNudge] = useState<NudgeDetail | null>(null);
  const { paused, changing, setPaused } = useEmailSendingState();

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<NudgeDetail>).detail;
      if (detail && !paused) setNudge(detail);
    };
    window.addEventListener(PACE_EVENT, handler);
    return () => window.removeEventListener(PACE_EVENT, handler);
  }, [paused]);

  useEffect(() => { if (paused) setNudge(null); }, [paused]);

  const advice = nudge ? paceAdvice(nudge.sent, nudge.recent, null) : null;
  const pct = nudge ? Math.min(100, (nudge.sent / DAILY_HEALTHY_LIMIT) * 100) : 0;

  const takeBreak = async () => {
    try {
      await setPaused(true);
      toast({ title: "Break started", description: "Your email sending is paused until you choose Resume sending." });
      setNudge(null);
    } catch {
      toast({ title: "Couldn't pause sending", description: "Please try again.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={!!nudge} onOpenChange={(o) => !o && setNudge(null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "h-10 w-10 rounded-xl grid place-items-center shrink-0",
                advice?.tone === "bad" ? "bg-destructive/10" : "bg-warning/10",
              )}
            >
              {advice?.tone === "bad" ? (
                <Gauge className="h-5 w-5 text-destructive" />
              ) : (
                <Coffee className="h-5 w-5 text-warning" />
              )}
            </div>
            <div className="min-w-0">
              <DialogTitle>{advice?.title ?? "Take a break"}</DialogTitle>
              <DialogDescription className="mt-0.5">Send pace coach</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground leading-relaxed">{advice?.body}</p>

          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-muted-foreground font-medium flex items-center gap-1">
                <Mail className="h-3 w-3" /> Today's sends
              </span>
              <span
                className={cn(
                  "font-semibold",
                  (nudge?.sent ?? 0) >= DAILY_HEALTHY_LIMIT && "text-destructive",
                )}
              >
                {nudge?.sent ?? 0} / {DAILY_HEALTHY_LIMIT}
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all",
                  (nudge?.sent ?? 0) >= DAILY_HEALTHY_LIMIT
                    ? "bg-destructive"
                    : pct >= 80
                      ? "bg-warning"
                      : "bg-primary",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              50 emails a day is the healthiest ceiling — we highlight it so your inbox rate stays high.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => setNudge(null)}>
            Keep going
          </Button>
          <Button onClick={takeBreak} className="gap-1.5" disabled={changing}>
            <Coffee className="h-3.5 w-3.5" /> Take a break
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
