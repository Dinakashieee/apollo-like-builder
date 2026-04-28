import { useState } from "react";
import { Mail, X, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function EmailConfirmBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);

  if (!user || user.email_confirmed_at || dismissed) return null;

  const resend = async () => {
    if (!user.email) return;
    setSending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: user.email,
      options: { emailRedirectTo: `${window.location.origin}/app` },
    });
    setSending(false);
    if (error) toast.error(error.message);
    else toast.success("Confirmation email sent — check your inbox.");
  };

  return (
    <div className="w-full bg-amber-50 dark:bg-amber-950/30 border-b border-amber-300/50 px-4 py-2 flex items-center justify-center gap-3 text-sm text-amber-900 dark:text-amber-200">
      <Mail className="h-4 w-4 shrink-0" />
      <span>
        Please confirm your email <strong>{user.email}</strong> to secure your account.
      </span>
      <button
        onClick={resend}
        disabled={sending}
        className="underline font-medium hover:no-underline disabled:opacity-50 inline-flex items-center gap-1"
      >
        {sending && <Loader2 className="h-3 w-3 animate-spin" />}
        Resend
      </button>
      <button onClick={() => setDismissed(true)} className="ml-2 opacity-60 hover:opacity-100">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
