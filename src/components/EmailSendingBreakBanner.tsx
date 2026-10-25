import { Coffee, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEmailSendingState } from "@/hooks/useEmailSendingState";
import { toast } from "@/hooks/use-toast";

export function EmailSendingBreakBanner() {
  const { paused, changing, setPaused } = useEmailSendingState();
  if (!paused) return null;
  return (
    <div role="status" className="flex flex-wrap items-center justify-between gap-3 border-b border-warning/30 bg-warning/10 px-4 py-3">
      <div className="flex items-center gap-2 min-w-0">
        <Coffee className="h-4 w-4 shrink-0 text-warning" />
        <div>
          <p className="text-sm font-semibold">Your email sending is paused</p>
          <p className="text-xs text-muted-foreground">Your scheduled emails are on hold. Other users can keep sending.</p>
        </div>
      </div>
      <Button size="sm" variant="outline" disabled={changing} onClick={async () => {
        try {
          await setPaused(false);
          toast({ title: "Sending resumed", description: "Your waiting emails can continue sending." });
        } catch {
          toast({ title: "Couldn't resume sending", description: "Please try again.", variant: "destructive" });
        }
      }}><Play className="h-3.5 w-3.5 mr-1.5" />Resume sending</Button>
    </div>
  );
}