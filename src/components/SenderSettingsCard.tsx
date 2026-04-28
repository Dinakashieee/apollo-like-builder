import { useEffect, useState } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Mail, ShieldCheck, Loader2, Send } from "lucide-react";
import { z } from "zod";

type Mode = "builtin" | "custom";

interface SenderSettings {
  id?: string;
  mode: Mode;
  from_name: string | null;
  from_email: string | null;
  reply_to: string | null;
  verified: boolean;
}

const emailSchema = z.string().trim().email().max(160);

export function SenderSettingsCard() {
  const { current } = useWorkspace();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SenderSettings>({
    mode: "builtin",
    from_name: "",
    from_email: "",
    reply_to: "",
    verified: false,
  });
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [code, setCode] = useState("");

  useEffect(() => {
    if (!current) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("email_sender_settings")
        .select("*")
        .eq("workspace_id", current.id)
        .maybeSingle();
      if (data) {
        setSettings({
          id: data.id,
          mode: (data.mode as Mode) ?? "builtin",
          from_name: data.from_name,
          from_email: data.from_email,
          reply_to: data.reply_to,
          verified: !!data.verified,
        });
      }
      setLoading(false);
    })();
  }, [current]);

  const persist = async (patch: Partial<SenderSettings> & { verification_code?: string | null; last_verification_sent_at?: string | null }) => {
    if (!current) return null;
    const payload = {
      workspace_id: current.id,
      mode: patch.mode ?? settings.mode,
      from_name: patch.from_name ?? settings.from_name,
      from_email: patch.from_email ?? settings.from_email,
      reply_to: patch.reply_to ?? settings.reply_to,
      verified: patch.verified ?? settings.verified,
      ...(patch.verification_code !== undefined ? { verification_code: patch.verification_code } : {}),
      ...(patch.last_verification_sent_at !== undefined ? { last_verification_sent_at: patch.last_verification_sent_at } : {}),
    };
    const { data, error } = await supabase
      .from("email_sender_settings")
      .upsert(payload, { onConflict: "workspace_id" })
      .select()
      .maybeSingle();
    if (error) {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
      return null;
    }
    return data;
  };

  const switchMode = async (mode: Mode) => {
    setSaving(true);
    const data = await persist({ mode, verified: mode === "builtin" ? true : settings.verified });
    if (data) {
      setSettings((s) => ({ ...s, mode, verified: mode === "builtin" ? true : s.verified }));
      toast({ title: mode === "builtin" ? "Using built-in sender" : "Custom sender selected" });
    }
    setSaving(false);
  };

  const sendVerification = async () => {
    if (!current) return;
    const parsed = emailSchema.safeParse(settings.from_email ?? "");
    if (!parsed.success) {
      toast({ title: "Invalid email", description: "Enter a valid From address first.", variant: "destructive" });
      return;
    }
    setSending(true);
    const code6 = Math.floor(100000 + Math.random() * 900000).toString();
    const data = await persist({
      from_email: parsed.data,
      verified: false,
      verification_code: code6,
      last_verification_sent_at: new Date().toISOString(),
    });
    if (!data) { setSending(false); return; }
    const { error: invokeErr } = await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "sender-verify",
        recipientEmail: parsed.data,
        idempotencyKey: `sender-verify-${current.id}-${code6}`,
        templateData: {
          code: code6,
          fromAddress: parsed.data,
          workspaceName: current.name,
        },
      },
    });
    setSending(false);
    if (invokeErr) {
      toast({ title: "Could not send code", description: invokeErr.message, variant: "destructive" });
      return;
    }
    toast({ title: "Verification code sent", description: `Check ${parsed.data} for a 6-digit code.` });
  };

  const confirmCode = async () => {
    if (!current) return;
    const { data } = await supabase
      .from("email_sender_settings")
      .select("verification_code")
      .eq("workspace_id", current.id)
      .maybeSingle();
    if (!data?.verification_code) {
      toast({ title: "No code on file", description: "Send a new verification email.", variant: "destructive" });
      return;
    }
    if (code.trim() !== data.verification_code) {
      toast({ title: "Code doesn't match", variant: "destructive" });
      return;
    }
    const updated = await persist({ verified: true, verification_code: null });
    if (updated) {
      setSettings((s) => ({ ...s, verified: true }));
      setCode("");
      toast({ title: "Sender verified", description: "Follow-ups will send from your address." });
    }
  };

  const saveDetails = async () => {
    setSaving(true);
    const data = await persist({});
    if (data) toast({ title: "Saved" });
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="card-elevated p-5 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading sender settings…
      </div>
    );
  }

  return (
    <div className="card-elevated p-5 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-display font-bold text-base text-primary-deep flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            Email sender
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Choose how follow-up emails are sent on your behalf.
          </p>
        </div>
        {settings.mode === "custom" && (
          <Badge variant={settings.verified ? "default" : "secondary"} className="text-[10px]">
            {settings.verified ? <><ShieldCheck className="h-3 w-3 mr-1" />Verified</> : "Unverified"}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => switchMode("builtin")}
          disabled={saving}
          className={`text-left rounded-lg border p-3 transition ${
            settings.mode === "builtin"
              ? "border-primary bg-primary/5 ring-1 ring-primary/40"
              : "border-border hover:border-primary/40"
          }`}
        >
          <p className="text-sm font-semibold text-primary-deep">Built-in sender (recommended)</p>
          <p className="text-xs text-muted-foreground mt-1">
            Send through our verified <code className="text-[10px]">notify.engageiqlk.com</code>{" "}
            domain. Replies go to your account email. Zero setup.
          </p>
        </button>
        <button
          type="button"
          onClick={() => switchMode("custom")}
          disabled={saving}
          className={`text-left rounded-lg border p-3 transition ${
            settings.mode === "custom"
              ? "border-primary bg-primary/5 ring-1 ring-primary/40"
              : "border-border hover:border-primary/40"
          }`}
        >
          <p className="text-sm font-semibold text-primary-deep">My own email address</p>
          <p className="text-xs text-muted-foreground mt-1">
            Use your existing inbox (e.g. <code className="text-[10px]">you@company.com</code>).
            Confirm ownership with a one-time 6-digit code.
          </p>
        </button>
      </div>

      {settings.mode === "custom" && (
        <div className="space-y-3 border-t border-border/60 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">From name</Label>
              <Input
                value={settings.from_name ?? ""}
                onChange={(e) => setSettings((s) => ({ ...s, from_name: e.target.value }))}
                placeholder="Jane at Acme"
              />
            </div>
            <div>
              <Label className="text-xs">From email</Label>
              <Input
                type="email"
                value={settings.from_email ?? ""}
                onChange={(e) => setSettings((s) => ({ ...s, from_email: e.target.value, verified: false }))}
                placeholder="jane@acme.com"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Reply-to (optional)</Label>
            <Input
              type="email"
              value={settings.reply_to ?? ""}
              onChange={(e) => setSettings((s) => ({ ...s, reply_to: e.target.value }))}
              placeholder="sales@acme.com"
            />
          </div>

          {!settings.verified ? (
            <div className="rounded-lg border border-dashed p-3 bg-muted/30 space-y-3">
              <p className="text-xs text-muted-foreground">
                We'll email a 6-digit code to your From address. Enter it here to confirm you own
                the inbox — required so we never send from an address you can't receive at.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button size="sm" variant="outline" onClick={sendVerification} disabled={sending || !settings.from_email}>
                  {sending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1" />}
                  Send code
                </Button>
                <Input
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="6-digit code"
                  className="sm:w-40 tracking-widest text-center"
                />
                <Button size="sm" onClick={confirmCode} disabled={code.length !== 6}>
                  Confirm
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Verified — follow-ups will send from {settings.from_email}.
            </div>
          )}

          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={saveDetails} disabled={saving}>
              {saving ? "Saving…" : "Save details"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
