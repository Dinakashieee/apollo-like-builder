import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, Download, Key, User as UserIcon, Lock, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BillingSection } from "@/components/BillingSection";

export default function Settings() {
  const { user, signOut } = useAuth();
  const { current, refresh } = useWorkspace();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [password, setPassword] = useState("");
  const [apolloKey, setApolloKey] = useState("");
  const [hasApollo, setHasApollo] = useState(false);
  const [saving, setSaving] = useState(false);
  // Email connect & signature
  const [senderEmail, setSenderEmail] = useState("");
  const [senderName, setSenderName] = useState("");
  const [emailSignature, setEmailSignature] = useState("");
  const [mailClient, setMailClient] = useState<string>("default");
  const [savingEmail, setSavingEmail] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, avatar_url, sender_email, sender_name, email_signature, preferred_mail_client")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setFullName(data?.full_name ?? "");
        setAvatarUrl(data?.avatar_url ?? "");
        setSenderEmail(data?.sender_email ?? user.email ?? "");
        setSenderName(data?.sender_name ?? data?.full_name ?? "");
        setEmailSignature(data?.email_signature ?? "");
        setMailClient(data?.preferred_mail_client ?? "default");
      });
    supabase
      .from("user_api_keys")
      .select("api_key")
      .eq("user_id", user.id)
      .eq("provider", "apollo")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.api_key) {
          setApolloKey("•".repeat(16));
          setHasApollo(true);
        }
      });
  }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, avatar_url: avatarUrl || null })
      .eq("id", user.id);
    setSaving(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: "Profile saved" });
  };

  const saveEmailSettings = async () => {
    if (!user) return;
    if (senderEmail) {
      const ok = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(senderEmail);
      if (!ok) {
        toast({ title: "Invalid email", description: "Enter a valid sending email.", variant: "destructive" });
        return;
      }
    }
    setSavingEmail(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        sender_email: senderEmail || null,
        sender_name: senderName || null,
        email_signature: emailSignature || null,
        preferred_mail_client: mailClient || "default",
      })
      .eq("id", user.id);
    setSavingEmail(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: "Email settings saved" });
  };

  const changePassword = async () => {
    if (password.length < 8) {
      toast({ title: "Password too short", description: "Min 8 characters.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Password updated" });
      setPassword("");
    }
  };

  const saveApollo = async () => {
    if (!user) return;
    if (!apolloKey || apolloKey.startsWith("•")) return;
    const { error } = await supabase.from("user_api_keys").upsert(
      { user_id: user.id, provider: "apollo", api_key: apolloKey, label: "Apollo.io" },
      { onConflict: "user_id,provider" }
    );
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Apollo key saved", description: "Data is accessed via your connected account." });
      setApolloKey("•".repeat(16));
      setHasApollo(true);
    }
  };

  const removeApollo = async () => {
    if (!user) return;
    await supabase.from("user_api_keys").delete().eq("user_id", user.id).eq("provider", "apollo");
    setApolloKey("");
    setHasApollo(false);
    toast({ title: "Apollo key removed" });
  };

  const exportData = async () => {
    if (!current) return;
    const [leads, opps, acts, company] = await Promise.all([
      supabase.from("leads").select("*").eq("workspace_id", current.id),
      supabase.from("opportunities").select("*").eq("workspace_id", current.id),
      supabase.from("activities").select("*").eq("workspace_id", current.id),
      supabase.from("company_profiles").select("*").eq("workspace_id", current.id),
    ]);
    const blob = new Blob(
      [JSON.stringify({ company: company.data, leads: leads.data, opportunities: opps.data, activities: acts.data }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `engageiq-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteAllData = async () => {
    if (!current) return;
    await Promise.all([
      supabase.from("leads").delete().eq("workspace_id", current.id),
      supabase.from("opportunities").delete().eq("workspace_id", current.id),
      supabase.from("activities").delete().eq("workspace_id", current.id),
      supabase.from("notifications").delete().eq("workspace_id", current.id),
    ]);
    toast({ title: "All workspace data deleted" });
    refresh();
  };

  const deleteAccount = async () => {
    if (!user) return;
    const { error } = await supabase.functions.invoke("delete-account");
    if (error) {
      toast({ title: "Could not delete account", description: error.message, variant: "destructive" });
      return;
    }
    await signOut();
    navigate("/");
    toast({ title: "Account deleted", description: "Your account and all associated data have been removed." });
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-3xl lg:text-4xl font-display font-bold text-primary-deep">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your profile, security, integrations, and data.</p>
      </div>

      {/* Billing */}
      <BillingSection />

      {/* Profile */}
      <section className="card-elevated p-6 space-y-4">
        <h2 className="font-display font-bold text-lg text-primary-deep flex items-center gap-2">
          <UserIcon className="h-4 w-4 text-primary" /> Profile
        </h2>
        <div>
          <Label>Email</Label>
          <Input value={user?.email ?? ""} disabled className="mt-1" />
        </div>
        <div>
          <Label>Full name</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Avatar URL</Label>
          <Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} className="mt-1" placeholder="https://..." />
        </div>
        <Button onClick={saveProfile} disabled={saving} className="bg-gradient-primary">Save profile</Button>
      </section>

      {/* Email connect & signature */}
      <section className="card-elevated p-6 space-y-4">
        <h2 className="font-display font-bold text-lg text-primary-deep flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" /> Connect your email
        </h2>
        <p className="text-sm text-muted-foreground">
          Set the email address generated drafts will be sent from, and a signature that's appended to every AI-written email automatically.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>Sending name</Label>
            <Input
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="John Farrell"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Sending email</Label>
            <Input
              type="email"
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              placeholder="you@yourcompany.com"
              className="mt-1"
            />
          </div>
        </div>
        <div>
          <Label>Preferred mail client</Label>
          <Select value={mailClient} onValueChange={setMailClient}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">System default (mailto:)</SelectItem>
              <SelectItem value="gmail">Gmail (open in browser)</SelectItem>
              <SelectItem value="outlook">Outlook Web</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            When you click "Open in mail client" in the composer, your draft opens in this app.
          </p>
        </div>
        <div>
          <Label>Email signature</Label>
          <Textarea
            rows={6}
            value={emailSignature}
            onChange={(e) => setEmailSignature(e.target.value)}
            placeholder={`Best regards,
John Farrell
Director, EngageIQ
john@engageiq.com  ·  +1 555 123 4567`}
            className="mt-1 font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Appended to every AI-generated email automatically.
          </p>
        </div>
        <Button onClick={saveEmailSettings} disabled={savingEmail} className="bg-gradient-primary">
          {savingEmail ? "Saving..." : "Save email settings"}
        </Button>
      </section>

      {/* Security */}
      <section className="card-elevated p-6 space-y-4">
        <h2 className="font-display font-bold text-lg text-primary-deep flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" /> Password
        </h2>
        <div>
          <Label>New password</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" />
        </div>
        <Button onClick={changePassword} variant="outline">Change password</Button>
      </section>

      {/* API keys */}
      <section className="card-elevated p-6 space-y-4">
        <h2 className="font-display font-bold text-lg text-primary-deep flex items-center gap-2">
          <Key className="h-4 w-4 text-primary" /> API integrations (BYOK)
        </h2>
        <p className="text-sm text-muted-foreground">
          Connect your own API keys. Data is accessed via your connected account — never shared with other users.
        </p>
        <div>
          <Label>Apollo.io API Key</Label>
          <Input
            value={apolloKey}
            onChange={(e) => setApolloKey(e.target.value)}
            className="mt-1"
            placeholder={hasApollo ? "Connected" : "Paste your Apollo API key"}
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={saveApollo} className="bg-gradient-primary">{hasApollo ? "Update" : "Connect"}</Button>
          {hasApollo && <Button variant="outline" onClick={removeApollo}>Disconnect</Button>}
        </div>
      </section>

      {/* Data control */}
      <section className="card-elevated p-6 space-y-4">
        <h2 className="font-display font-bold text-lg text-primary-deep">Your data</h2>
        <p className="text-sm text-muted-foreground">Export everything, or wipe your workspace data. You own your data.</p>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" /> Export workspace data
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-destructive border-destructive/40 hover:bg-destructive/10">
                <Trash2 className="h-4 w-4 mr-2" /> Delete all workspace data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete all workspace data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This deletes all leads, opportunities, activities, and notifications in this workspace. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={deleteAllData} className="bg-destructive">Delete everything</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" /> Delete my account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently deletes your account, all workspaces you own, and all associated data. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={deleteAccount} className="bg-destructive">Delete account</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </section>
    </div>
  );
}
