import { useEffect, useState } from "react";
import { Sparkles, Send, RefreshCw, Mail, ShieldCheck, Globe } from "lucide-react";
import { EmailBestPracticesDialog } from "@/components/EmailBestPracticesDialog";
import { findCountry } from "@/lib/countries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { logActivity } from "@/lib/activities";
import { useEntitlements } from "@/hooks/useEntitlements";
import { UpgradeModal } from "@/components/UpgradeModal";

export default function Composer() {
  const { current } = useWorkspace();
  const { user } = useAuth();
  const { aiEmailsUsed, aiEmailsLimit, aiEmailsAtLimit, aiEmailsNearLimit, tier, refetch: refetchUsage } =
    useEntitlements();
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedLead, setSelectedLead] = useState<string>("");
  const [tone, setTone] = useState("professional");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [generating, setGenerating] = useState(false);
  const [hasCompany, setHasCompany] = useState(false);
  const [mailClient, setMailClient] = useState<string>("default");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [tipsOpen, setTipsOpen] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (!current) return;
    supabase
      .from("leads")
      .select("id, company_name, contact_name, role, email, country")
      .eq("workspace_id", current.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setLeads(data ?? []);
        if (data && data.length > 0 && !selectedLead) setSelectedLead(data[0].id);
      });
    supabase
      .from("company_profiles")
      .select("id")
      .eq("workspace_id", current.id)
      .maybeSingle()
      .then(({ data }) => setHasCompany(!!data));
    if (user) {
      supabase
        .from("profiles")
        .select("preferred_mail_client")
        .eq("id", user.id)
        .maybeSingle()
        .then(({ data }) => setMailClient(data?.preferred_mail_client ?? "default"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  const generate = async () => {
    if (!current || !selectedLead) {
      toast({ title: "Pick a lead first", variant: "destructive" });
      return;
    }
    if (aiEmailsAtLimit) {
      setUpgradeOpen(true);
      return;
    }
    if (aiEmailsNearLimit && tier !== "pro") {
      toast({
        title: "Nearing AI email limit",
        description: `${aiEmailsUsed} of ${aiEmailsLimit} used this month.`,
      });
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-email", {
        body: { workspace_id: current.id, lead_id: selectedLead, tone },
      });
      if (error) throw error;
      if (data?.error) {
        if (data.code === "quota_exceeded") {
          setUpgradeOpen(true);
          throw new Error(data.error);
        }
        throw new Error(data.error);
      }
      setSubject(data.subject ?? "");
      setBody(data.body ?? "");
      const lead = leads.find((l) => l.id === selectedLead);
      await logActivity(
        current.id,
        user?.id,
        "email_generated",
        `Email drafted for ${lead?.company_name ?? "lead"}`
      );
      refetchUsage();
    } catch (e: any) {
      toast({ title: "Failed", description: e?.message ?? "Try again", variant: "destructive" });
    }
    setGenerating(false);
  };

  const lead = leads.find((l) => l.id === selectedLead);

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <EmailBestPracticesDialog
        open={tipsOpen}
        onOpenChange={(o) => setTipsOpen(o ? true : undefined)}
      />
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm text-primary font-medium mb-1 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> AI-assisted
          </p>
          <h1 className="text-3xl lg:text-4xl font-display font-bold text-primary-deep">
            Smart Email Composer
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {tier !== "pro" && isFinite(aiEmailsLimit) && (
            <span className="text-xs text-muted-foreground">
              {aiEmailsUsed}/{aiEmailsLimit} AI emails this month
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTipsOpen(true)}
            className="gap-1.5"
          >
            <ShieldCheck className="h-4 w-4" /> Compliance tips
          </Button>
          <Button onClick={generate} disabled={generating || !selectedLead} className="bg-gradient-primary shadow-glow">
            {generating ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            {generating ? "Writing..." : "Generate with AI"}
          </Button>
        </div>
      </div>
      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        title="AI email limit reached"
        description={`You've used ${aiEmailsUsed} of ${aiEmailsLimit} AI emails this month on the ${tier} plan. Upgrade for more.`}
      />

      {!hasCompany ? (
        <div className="card-elevated p-4 border-warm/40 bg-warm/5 text-sm">
          ⚠️ Add your company profile and products in <strong>Company</strong> — the AI uses them to write context-aware emails tailored to what you actually sell.
        </div>
      ) : (
        <div className="card-elevated p-4 border-primary/30 bg-primary/5 text-sm flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <span>
            Emails are personalized using <strong>your company profile</strong> and the <strong>products & services</strong> you listed in Company. Update them anytime to change the AI's voice and offer.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card-elevated p-6 lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Lead</Label>
              <Select value={selectedLead} onValueChange={setSelectedLead}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a lead" />
                </SelectTrigger>
                <SelectContent>
                  {leads.length === 0 && (
                    <div className="px-2 py-2 text-xs text-muted-foreground">No leads yet</div>
                  )}
                  {leads.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.contact_name || l.company_name} · {l.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="direct">Direct</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject line will appear here..."
              className="mt-1"
            />
          </div>
          <div>
            <Label>Body</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={14}
              placeholder="Click 'Generate with AI' to draft a personalized email..."
              className="mt-1"
            />
          </div>

          <div className="flex justify-between pt-3 border-t border-border/60">
            <p className="text-xs text-muted-foreground">
              {body.length} characters
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (!lead?.email) {
                  toast({ title: "No email", description: "Add an email to this lead first.", variant: "destructive" });
                  return;
                }
                const to = encodeURIComponent(lead.email);
                const su = encodeURIComponent(subject);
                const bd = encodeURIComponent(body);
                let url = `mailto:${lead.email}?subject=${su}&body=${bd}`;
                if (mailClient === "gmail") {
                  url = `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${su}&body=${bd}`;
                  window.open(url, "_blank");
                  return;
                }
                if (mailClient === "outlook") {
                  url = `https://outlook.live.com/mail/0/deeplink/compose?to=${to}&subject=${su}&body=${bd}`;
                  window.open(url, "_blank");
                  return;
                }
                window.location.href = url;
              }}
              disabled={!subject && !body}
            >
              <Send className="h-4 w-4 mr-2" /> Open in mail client
            </Button>
          </div>
        </div>

        <div className="card-elevated p-5 h-fit">
          <h3 className="font-display font-bold text-base text-primary-deep mb-3 flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" /> Selected lead
          </h3>
          {lead ? (
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Company</p>
                <p className="font-semibold text-primary-deep">{lead.company_name}</p>
              </div>
              {lead.contact_name && (
                <div>
                  <p className="text-xs text-muted-foreground">Contact</p>
                  <p className="font-medium">{lead.contact_name}</p>
                </div>
              )}
              {lead.role && (
                <div>
                  <p className="text-xs text-muted-foreground">Role</p>
                  <p className="font-medium">{lead.role}</p>
                </div>
              )}
              {lead.email && (
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium text-primary">{lead.email}</p>
                </div>
              )}
              {lead.country && findCountry(lead.country) && (
                <div className="pt-2 border-t border-border/60">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Globe className="h-3 w-3" /> Country
                  </p>
                  <p className="font-medium">{findCountry(lead.country)!.name}</p>
                  <div className="mt-2 rounded-md border border-warm/40 bg-warm/5 p-2 text-[11px]">
                    <p className="font-semibold text-primary-deep mb-0.5">
                      Applies: {findCountry(lead.country)!.law}
                    </p>
                    <p className="text-muted-foreground leading-snug">
                      {findCountry(lead.country)!.lawSummary}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No lead selected.</p>
          )}
        </div>
      </div>
    </div>
  );
}
