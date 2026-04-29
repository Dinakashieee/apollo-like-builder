import { usePresence } from "@/hooks/usePresence";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function PresenceIndicator() {
  const { online, count } = usePresence();
  if (count === 0) return null;

  const visible = online.slice(0, 3);
  const extra = count - visible.length;

  const initials = (name?: string, email?: string) =>
    (name || email || "?")
      .split(/\s|@/)
      .map((s) => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="hidden sm:flex items-center gap-2 px-2.5 h-9 rounded-full bg-muted/40 border border-border/60 hover:bg-muted/60 transition-colors cursor-default">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <div className="flex -space-x-1.5">
              {visible.map((u) => (
                <div
                  key={u.user_id}
                  className="h-6 w-6 rounded-full border-2 border-background bg-gradient-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center overflow-hidden"
                  title={u.full_name || u.email}
                >
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initials(u.full_name, u.email)
                  )}
                </div>
              ))}
              {extra > 0 && (
                <div className="h-6 w-6 rounded-full border-2 border-background bg-muted text-foreground text-[10px] font-semibold flex items-center justify-center">
                  +{extra}
                </div>
              )}
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {count} active
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="font-semibold mb-1 text-xs">Online now</p>
          <ul className="space-y-1">
            {online.map((u) => (
              <li key={u.user_id} className="text-xs text-muted-foreground">
                {u.full_name || u.email || u.user_id.slice(0, 8)}
              </li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
