import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";

export function ConnectInboxBanner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { current } = useWorkspace();
  const { isActive } = useSubscription(user?.id);
  const [hidden, setHidden] = useState(true);
  const [hasAccount, setHasAccount] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user || !current || !isActive) {
      setHidden(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const [{ data: profile }, { data: accounts }] = await Promise.all([
        supabase.from("profiles").select("inbox_prompt_dismissed_at").eq("id", user.id).maybeSingle(),
        supabase.from("email_accounts").select("id").eq("workspace_id", current.id).limit(1),
      ]);
      if (cancelled) return;
      const has = (accounts?.length ?? 0) > 0;
      setHasAccount(has);
      const dismissed = !!profile?.inbox_prompt_dismissed_at;
      const dismissedRecent = dismissed
        && (Date.now() - new Date(profile!.inbox_prompt_dismissed_at!).getTime()) < 7 * 24 * 60 * 60 * 1000;
      setHidden(has || dismissedRecent);
    })();
    return () => { cancelled = true; };
  }, [user, current, isActive]);

  const dismiss = async () => {
    setHidden(true);
    if (user) {
      await supabase.from("profiles").update({ inbox_prompt_dismissed_at: new Date().toISOString() }).eq("id", user.id);
    }
  };

  if (hidden || hasAccount) return null;

  return (
    <div className="w-full bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-2 min-w-0">
        <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="text-foreground/90 truncate">
          <strong>Boost deliverability</strong> — connect your company Gmail or Outlook so cold emails come from you and replies land in your leads.
        </span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button size="sm" className="h-7 text-xs" onClick={() => navigate("/settings")}>
          <Mail className="h-3 w-3 mr-1" /> Connect inbox
        </Button>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={dismiss}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
