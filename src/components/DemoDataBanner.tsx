import { useEffect, useState } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

/**
 * Shows a banner on every authed page reminding the user that the workspace
 * was pre-filled with demo data, with a quick link to wipe it from Settings.
 * Auto-hides forever once dismissed (or once demo data is cleared).
 */
export function DemoDataBanner() {
  const { current, refresh } = useWorkspace();
  const [hasDemo, setHasDemo] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!current?.id) return;
    let cancelled = false;
    (async () => {
      const { data: ws } = await supabase
        .from("workspaces")
        .select("demo_seeded_at, demo_banner_dismissed_at")
        .eq("id", current.id)
        .maybeSingle();
      if (cancelled || !ws) return;
      const seeded = !!ws.demo_seeded_at;
      const wasDismissed = !!ws.demo_banner_dismissed_at;
      // Confirm there's actually demo data left (user may have wiped manually)
      if (seeded) {
        const { count } = await supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", current.id)
          .eq("is_demo", true);
        setHasDemo((count ?? 0) > 0);
      }
      setDismissed(wasDismissed);
    })();
    return () => {
      cancelled = true;
    };
  }, [current?.id]);

  const dismiss = async () => {
    if (!current?.id) return;
    setDismissed(true);
    await supabase
      .from("workspaces")
      .update({ demo_banner_dismissed_at: new Date().toISOString() })
      .eq("id", current.id);
    refresh?.();
  };

  if (!hasDemo || dismissed) return null;

  return (
    <div className="bg-gradient-to-r from-warm/15 via-primary/10 to-primary/5 border-b border-primary/20">
      <div className="max-w-screen-2xl mx-auto px-4 py-2.5 flex items-center gap-3 flex-wrap">
        <Sparkles className="h-4 w-4 text-primary shrink-0" />
        <p className="text-xs text-primary-deep flex-1 min-w-[200px]">
          <strong>You're viewing demo data</strong> — sample leads, replies, and
          opportunities to show you the look & feel. Clear it before going live.
        </p>
        <Link
          to="/settings"
          className="text-xs font-semibold text-primary hover:underline whitespace-nowrap"
        >
          Manage demo data →
        </Link>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          onClick={dismiss}
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
