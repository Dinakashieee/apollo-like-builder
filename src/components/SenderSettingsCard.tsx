import { useEffect, useState } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  Mail,
  ShieldCheck,
  Loader2,
  Send,
  Building2,
  Sparkles,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Copy,
  Trash2,
  KeyRound,
  ExternalLink,
} from "lucide-react";
import { z } from "zod";

type Mode = "builtin" | "custom";
type Provider = "google" | "microsoft";

interface SenderSettings {
  id?: string;
  mode: Mode;
  from_name: string | null;
  from_email: string | null;
  reply_to: string | null;
  verified: boolean;
}

interface ConnectedAccount {
  id: string;
  provider: "gmail" | "outlook";
  email_address: string;
  display_name: string | null;
  status: string;
}

interface OAuthApp {
  id: string;
  provider: Provider;
  client_id: string;
  label: string | null;
}

const emailSchema = z.string().trim().email().max(160);

const PERSONAL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "outlook.com", "hotmail.com",
  "live.com", "icloud.com", "me.com", "aol.com", "proton.me", "protonmail.com",
]);

function isPersonalDomain(email: string | null) {
  if (!email) return false;
  const d = email.split("@")[1]?.toLowerCase().trim();
  return d ? PERSONAL_DOMAINS.has(d) : false;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const GOOGLE_REDIRECT = `${SUPABASE_URL}/functions/v1/oauth-google-callback`;
const MS_REDIRECT = `${SUPABASE_URL}/functions/v1/oauth-microsoft-callback`;

function CopyField({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      <div className="flex gap-1 mt-1">
        <Input value={value} readOnly className="font-mono text-xs h-8" />
        <Button
          size="sm"
          variant="outline"
          type="button"
          className="h-8 px-2"
          onClick={() => {
            navigator.clipboard.writeText(value);
            toast({ title: "Copied" });
          }}
        >
          <Copy className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

export function SenderSettingsCard() {
  const { current } = useWorkspace();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SenderSettings>({
    mode: "builtin", from_name: "", from_email: "", reply_to: "", verified: false,
  });
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [oauthApps, setOauthApps] = useState<Record<Provider, OAuthApp | null>>({
    google: null, microsoft: null,
  });
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [code, setCode] = useState("");
  const [setupOpen, setSetupOpen] = useState<Provider | null>(null);
  const [credForm, setCredForm] = useState<Record<Provider, { client_id: string; client_secret: string }>>({
    google: { client_id: "", client_secret: "" },
    microsoft: { client_id: "", client_secret: "" },
  });
  const [savingCred, setSavingCred] = useState<Provider | null>(null);
  const [connecting, setConnecting] = useState<Provider | null>(null);

  useEffect(() => {
    if (!current) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [s, a, o] = await Promise.all([
        supabase.from("email_sender_settings").select("*").eq("workspace_id", current.id).maybeSingle(),
        supabase.from("email_accounts").select("id, provider, email_address, display_name, status").eq("workspace_id", current.id),
        supabase.from("user_oauth_apps").select("id, provider, client_id, label").eq("workspace_id", current.id),
      ]);
      if (cancelled) return;
      if (s.data) {
        setSettings({
          id: s.data.id,
          mode: (s.data.mode as Mode) ?? "builtin",
          from_name: s.data.from_name,
          from_email: s.data.from_email,
          reply_to: s.data.reply_to,
          verified: !!s.data.verified,
        });
      }
      setAccounts((a.data as ConnectedAccount[]) ?? []);
      const apps: Record<Provider, OAuthApp | null> = { google: null, microsoft: null };
      for (const row of (o.data as OAuthApp[]) ?? []) apps[row.provider] = row;
      setOauthApps(apps);
      setCredForm({
        google: {
          client_id: apps.google?.client_id ?? "",
          client_secret: apps.google ? "••••••••••••" : "",
        },
        microsoft: {
          client_id: apps.microsoft?.client_id ?? "",
          client_secret: apps.microsoft ? "••••••••••••" : "",
        },
      });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [current]);

  const persist = async (patch: Partial<SenderSettings> & {
    verification_code?: string | null;
    last_verification_sent_at?: string | null;
  }) => {
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
      .select().maybeSingle();
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
      toast({ title: mode === "builtin" ? "Using built-in sender" : "Custom company inbox selected" });
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
    if (isPersonalDomain(parsed.data)) {
      toast({ title: "Use your company domain", description: "Personal addresses can't be used for cold outreach.", variant: "destructive" });
      return;
    }
    setSending(true);
    const code6 = Math.floor(100000 + Math.random() * 900000).toString();
    const data = await persist({
      from_email: parsed.data, verified: false,
      verification_code: code6, last_verification_sent_at: new Date().toISOString(),
    });
    if (!data) { setSending(false); return; }
    const { error: invokeErr } = await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "sender-verify", recipientEmail: parsed.data,
        idempotencyKey: `sender-verify-${current.id}-${code6}`,
        templateData: { code: code6, fromAddress: parsed.data, workspaceName: current.name },
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
    const { data } = await supabase.from("email_sender_settings").select("verification_code").eq("workspace_id", current.id).maybeSingle();
    if (!data?.verification_code) {
      toast({ title: "No code on file", description: "Send a new verification email.", variant: "destructive" });
      return;
    }
    if (code.trim() !== data.verification_code) {
      toast({ title: "Code doesn't match", variant: "destructive" }); return;
    }
    const updated = await persist({ verified: true, verification_code: null });
    if (updated) {
      setSettings((s) => ({ ...s, verified: true }));
      setCode("");
      toast({ title: "Inbox verified" });
    }
  };

  const saveDetails = async () => {
    setSaving(true);
    const data = await persist({});
    if (data) toast({ title: "Saved" });
    setSaving(false);
  };

  const saveCredentials = async (provider: Provider) => {
    if (!current) return;
    const form = credForm[provider];
    if (!form.client_id.trim() || !form.client_secret.trim() || form.client_secret.startsWith("••")) {
      toast({ title: "Enter both Client ID and Secret", variant: "destructive" });
      return;
    }
    setSavingCred(provider);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("user_oauth_apps").upsert({
      workspace_id: current.id,
      provider,
      client_id: form.client_id.trim(),
      client_secret: form.client_secret.trim(),
      created_by: user!.id,
    }, { onConflict: "workspace_id,provider" });
    setSavingCred(null);
    if (error) {
      toast({ title: "Could not save credentials", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `${provider === "google" ? "Google" : "Microsoft"} credentials saved` });
    // Refresh
    const { data: o } = await supabase.from("user_oauth_apps").select("id, provider, client_id, label").eq("workspace_id", current.id);
    const apps: Record<Provider, OAuthApp | null> = { google: null, microsoft: null };
    for (const row of (o as OAuthApp[]) ?? []) apps[row.provider] = row;
    setOauthApps(apps);
    setCredForm((s) => ({ ...s, [provider]: { client_id: apps[provider]?.client_id ?? "", client_secret: "••••••••••••" } }));
  };

  const removeCredentials = async (provider: Provider) => {
    if (!current) return;
    if (!confirm(`Remove ${provider} OAuth credentials?`)) return;
    await supabase.from("user_oauth_apps").delete().eq("workspace_id", current.id).eq("provider", provider);
    setOauthApps((s) => ({ ...s, [provider]: null }));
    setCredForm((s) => ({ ...s, [provider]: { client_id: "", client_secret: "" } }));
    toast({ title: "Credentials removed" });
  };

  const startOAuth = async (provider: Provider) => {
    if (!current) return;
    if (!oauthApps[provider]) {
      toast({
        title: "Add credentials first",
        description: `Save your ${provider === "google" ? "Google" : "Microsoft"} Client ID and Secret below before connecting.`,
        variant: "destructive",
      });
      setSetupOpen(provider);
      return;
    }
    setConnecting(provider);
    const { data, error } = await supabase.functions.invoke("oauth-start", {
      body: { provider, workspace_id: current.id },
    });
    setConnecting(null);
    if (error || !data?.url) {
      toast({ title: "Could not start OAuth", description: error?.message ?? "No URL", variant: "destructive" });
      return;
    }
    window.location.href = data.url;
  };

  const disconnectAccount = async (id: string) => {
    if (!confirm("Disconnect this mailbox?")) return;
    await supabase.from("email_accounts").delete().eq("id", id);
    setAccounts((s) => s.filter((a) => a.id !== id));
    toast({ title: "Mailbox disconnected" });
  };

  if (loading) {
    return (
      <div className="card-elevated p-5 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading sender settings…
      </div>
    );
  }

  const personalWarning = settings.mode === "custom" && isPersonalDomain(settings.from_email);

  return (
    <div className="card-elevated p-5 space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-display font-bold text-base text-primary-deep flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" /> Email sender
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
            Connect the <strong>company / client work inbox</strong> you want replies to land in. We never use your personal Gmail or Outlook.
          </p>
        </div>
      </div>

      {/* Connected mailbox accounts */}
      <div className="rounded-lg border border-border/60 p-4 space-y-3 bg-muted/20">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-primary-deep">Connect your company mailbox</p>
          </div>
          <Badge variant="outline" className="text-[10px]">Best — full reply capture</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Send as <code className="text-[10px]">jane@yourcompany.com</code>. Captures every reply into the lead conversation.
        </p>

        {accounts.length > 0 && (
          <div className="space-y-1.5">
            {accounts.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-md border border-border/60 bg-background px-3 py-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="secondary" className="text-[10px] capitalize">{a.provider}</Badge>
                  <span className="font-medium truncate">{a.email_address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={a.status === "active" ? "default" : "destructive"} className="text-[10px]">{a.status}</Badge>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => disconnectAccount(a.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(["google", "microsoft"] as Provider[]).map((provider) => {
            const isGoogle = provider === "google";
            const hasCreds = !!oauthApps[provider];
            return (
              <div key={provider} className="rounded-md border border-border/60 bg-background overflow-hidden">
                <div className="p-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {isGoogle ? (
                      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    ) : (
                      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24"><rect x="2" y="2" width="9" height="9" fill="#F25022"/><rect x="13" y="2" width="9" height="9" fill="#7FBA00"/><rect x="2" y="13" width="9" height="9" fill="#00A4EF"/><rect x="13" y="13" width="9" height="9" fill="#FFB900"/></svg>
                    )}
                    <span className="text-xs font-medium truncate">{isGoogle ? "Gmail / Google Workspace" : "Outlook / Microsoft 365"}</span>
                    {hasCreds && <Badge variant="outline" className="text-[9px] shrink-0"><KeyRound className="h-2.5 w-2.5 mr-0.5" />App configured</Badge>}
                  </div>
                </div>
                <div className="px-2.5 pb-2.5 flex gap-1.5">
                  <Button size="sm" className="flex-1 h-7 text-xs" disabled={connecting === provider} onClick={() => startOAuth(provider)}>
                    {connecting === provider ? <Loader2 className="h-3 w-3 animate-spin" /> : "Connect"}
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => setSetupOpen(setupOpen === provider ? null : provider)}>
                    {setupOpen === provider ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {hasCreds ? "Edit" : "Setup"}
                  </Button>
                </div>

                {setupOpen === provider && (
                  <div className="border-t border-border/60 bg-muted/30 p-3 space-y-3">
                    <div className="text-[11px] text-muted-foreground space-y-1.5">
                      <p className="font-semibold text-foreground">One-time setup (≈10 min):</p>
                      {isGoogle ? (
                        <ol className="list-decimal pl-4 space-y-1">
                          <li>Open <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-0.5">Google Cloud Console <ExternalLink className="h-2.5 w-2.5" /></a> → create or pick a project</li>
                          <li><b>APIs & Services → Library</b> → enable <b>Gmail API</b></li>
                          <li><b>OAuth consent screen</b> → External → fill app name + support email → add scopes <code>gmail.send</code>, <code>gmail.readonly</code>, <code>gmail.modify</code></li>
                          <li><b>Credentials → Create Credentials → OAuth Client ID → Web application</b></li>
                          <li>Paste the redirect URI below into <b>Authorized redirect URIs</b></li>
                          <li>Copy the Client ID + Secret here</li>
                        </ol>
                      ) : (
                        <ol className="list-decimal pl-4 space-y-1">
                          <li>Open <a href="https://entra.microsoft.com" target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-0.5">Microsoft Entra <ExternalLink className="h-2.5 w-2.5" /></a> → <b>App registrations → New registration</b></li>
                          <li>Account types: <b>Any organizational directory + personal accounts</b></li>
                          <li>Add the Web Redirect URI below</li>
                          <li><b>API permissions → Microsoft Graph → Delegated</b>: <code>Mail.Send</code>, <code>Mail.Read</code>, <code>Mail.ReadWrite</code>, <code>offline_access</code>, <code>User.Read</code></li>
                          <li><b>Certificates & secrets → New client secret</b> → copy the <b>Value</b></li>
                          <li>Copy the Application (client) ID + Secret here</li>
                        </ol>
                      )}
                    </div>

                    <CopyField label="Redirect URI" value={isGoogle ? GOOGLE_REDIRECT : MS_REDIRECT} />

                    <div className="grid grid-cols-1 gap-2">
                      <div>
                        <Label className="text-[11px]">Client ID</Label>
                        <Input
                          className="h-8 font-mono text-xs"
                          value={credForm[provider].client_id}
                          onChange={(e) => setCredForm((s) => ({ ...s, [provider]: { ...s[provider], client_id: e.target.value } }))}
                          placeholder={isGoogle ? "1234-abc.apps.googleusercontent.com" : "00000000-0000-0000-0000-000000000000"}
                        />
                      </div>
                      <div>
                        <Label className="text-[11px]">Client Secret</Label>
                        <Input
                          type="password"
                          className="h-8 font-mono text-xs"
                          value={credForm[provider].client_secret}
                          onChange={(e) => setCredForm((s) => ({ ...s, [provider]: { ...s[provider], client_secret: e.target.value } }))}
                          placeholder="Paste secret"
                          onFocus={(e) => { if (e.target.value.startsWith("••")) setCredForm((s) => ({ ...s, [provider]: { ...s[provider], client_secret: "" } })); }}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end">
                      {hasCreds && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => removeCredentials(provider)}>
                          <Trash2 className="h-3 w-3 mr-1" /> Remove
                        </Button>
                      )}
                      <Button size="sm" className="h-7 text-xs" disabled={savingCred === provider} onClick={() => saveCredentials(provider)}>
                        {savingCred === provider ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save credentials"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-primary" />
          Once connected, every reply lands in the lead's conversation and we score it (hot / warm / cold) with a suggested next step.
        </p>
      </div>

      {/* Fallback path */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button type="button" onClick={() => switchMode("builtin")} disabled={saving}
          className={`text-left rounded-lg border p-3 transition ${settings.mode === "builtin" ? "border-primary bg-primary/5 ring-1 ring-primary/40" : "border-border hover:border-primary/40"}`}>
          <p className="text-sm font-semibold text-primary-deep">Built-in sender</p>
          <p className="text-xs text-muted-foreground mt-1">Send through our verified <code className="text-[10px]">notify.engageiqlk.com</code> domain. Zero setup — good for testing.</p>
        </button>
        <button type="button" onClick={() => switchMode("custom")} disabled={saving}
          className={`text-left rounded-lg border p-3 transition ${settings.mode === "custom" ? "border-primary bg-primary/5 ring-1 ring-primary/40" : "border-border hover:border-primary/40"}`}>
          <p className="text-sm font-semibold text-primary-deep">SMTP-verified company address</p>
          <p className="text-xs text-muted-foreground mt-1">Use <code className="text-[10px]">you@yourcompany.com</code> via a 6-digit code. Faster than OAuth but won't auto-capture replies.</p>
        </button>
      </div>

      {settings.mode === "custom" && (
        <div className="space-y-3 border-t border-border/60 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">From name</Label>
              <Input value={settings.from_name ?? ""} onChange={(e) => setSettings((s) => ({ ...s, from_name: e.target.value }))} placeholder="Jane at Acme" />
            </div>
            <div>
              <Label className="text-xs">From email (company domain)</Label>
              <Input type="email" value={settings.from_email ?? ""} onChange={(e) => setSettings((s) => ({ ...s, from_email: e.target.value, verified: false }))} placeholder="jane@acme.com" />
            </div>
          </div>

          {personalWarning && (
            <div className="rounded-lg border border-warm/40 bg-warm/5 p-3 text-xs text-warm flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>That's a personal email domain. Use a company / client work address.</span>
            </div>
          )}

          <div>
            <Label className="text-xs">Reply-to (optional)</Label>
            <Input type="email" value={settings.reply_to ?? ""} onChange={(e) => setSettings((s) => ({ ...s, reply_to: e.target.value }))} placeholder="sales@acme.com" />
          </div>

          {!settings.verified ? (
            <div className="rounded-lg border border-dashed p-3 bg-muted/30 space-y-3">
              <p className="text-xs text-muted-foreground">We'll email a 6-digit code to your From address.</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button size="sm" variant="outline" onClick={sendVerification} disabled={sending || !settings.from_email}>
                  {sending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1" />}
                  Send code
                </Button>
                <Input inputMode="numeric" pattern="\d{6}" maxLength={6} value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="6-digit code" className="sm:w-40 tracking-widest text-center" />
                <Button size="sm" onClick={confirmCode} disabled={code.length !== 6}>Confirm</Button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> Verified — follow-ups will send from {settings.from_email}.
            </div>
          )}

          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={saveDetails} disabled={saving}>{saving ? "Saving…" : "Save details"}</Button>
          </div>
        </div>
      )}
    </div>
  );
}
