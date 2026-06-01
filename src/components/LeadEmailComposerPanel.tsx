import { useEffect, useState } from "react";
import { Sparkles, Send, RefreshCw, Mail, Globe } from "lucide-react";
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
import { LeadConversation } from "@/components/LeadConversation";

interface Props {
  lead: any;
}

export function LeadEmailComposerPanel({ lead }: Props) {
  const { current } = useWorkspace();
  const { user } = useAuth();
  const { aiEmailsUsed, aiEmailsLimit, aiEmailsAtLimit, aiEmailsNearLimit, tier, refetch } =
    useEntitlements();

  const [tone, setTone] = useState("professional");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [generating, setGenerating] = useState(false);
  const [mailClient, setMailClient] = useState<string>("default");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [meetingAttendees, setMeetingAttendees] = useState("");
  const [meetingType, setMeetingType] = useState("not_specified");
  const [meetingDescription, setMeetingDescription] = useState("");
  const [awards, setAwards] = useState("");
  const [signatureOverride, setSignatureOverride] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("preferred_mail_client")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setMailClient(data?.preferred_mail_client ?? "default"));
  }, [user?.id]);

  const generate = async () => {
    if (!current || !lead?.id) return;
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
        body: {
          workspace_id: current.id,
          lead_id: lead.id,
          tone,
          meeting_attendees: meetingAttendees.trim() || undefined,
          meeting_type: meetingType === "not_specified" ? undefined : meetingType,
          meeting_description: meetingDescription.trim() || undefined,
          awards: awards.trim() || undefined,
          signature_override: signatureOverride.trim() || undefined,
        },
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
      await logActivity(
        current.id,
        user?.id,
        "email_generated",
        `Email drafted for ${lead.company_name ?? "lead"}`,
      );
      refetch();
    } catch (e: any) {
      toast({ title: "Failed", description: e?.message ?? "Try again", variant: "destructive" });
    }
    setGenerating(false);
  };

  const send = () => {
    if (!lead?.email) {
      toast({ title: "No email", description: "Add an email to this lead first.", variant: "destructive" });
      return;
    }
    const to = encodeURIComponent(lead.email);
    const su = encodeURIComponent(subject);
    const bd = encodeURIComponent(body);
    if (mailClient === "gmail") {
      window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${su}&body=${bd}`, "_blank");
      return;
    }
    if (mailClient === "outlook") {
      window.open(`https://outlook.live.com/mail/0/deeplink/compose?to=${to}&subject=${su}&body=${bd}`, "_blank");
      return;
    }
    window.location.href = `mailto:${lead.email}?subject=${su}&body=${bd}`;
  };

  return (
    <div className="space-y-6">
      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        title="AI email limit reached"
        description={`You've used ${aiEmailsUsed} of ${aiEmailsLimit} AI emails this month on the ${tier} plan. Upgrade for more.`}
      />

      <div className="card-elevated p-5 space-y-4">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs text-primary font-medium mb-0.5 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" /> AI-assisted
            </p>
            <h3 className="font-display font-bold text-base text-primary-deep">
              Compose to {lead?.contact_name || lead?.company_name}
            </h3>
            {lead?.email && (
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <Mail className="h-3 w-3" /> {lead.email}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {tier !== "pro" && isFinite(aiEmailsLimit) && (
              <span className="text-[11px] text-muted-foreground">
                {aiEmailsUsed}/{aiEmailsLimit}
              </span>
            )}
            <Button
              onClick={generate}
              disabled={generating}
              size="sm"
              className="bg-gradient-primary shadow-glow"
            >
              {generating ? (
                <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              )}
              {generating ? "Writing..." : "Generate"}
            </Button>
          </div>
        </div>

        <div>
          <Label className="text-xs">Tone</Label>
          <Select value={tone} onValueChange={setTone}>
            <SelectTrigger className="mt-1 h-9">
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

        <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-3">
          <p className="text-[11px] font-semibold text-primary-deep uppercase tracking-wide">
            Context (optional)
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Meeting type</Label>
              <Select value={meetingType} onValueChange={setMeetingType}>
                <SelectTrigger className="mt-1 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_specified">Not specified</SelectItem>
                  <SelectItem value="online virtual call (Zoom / Teams / Google Meet)">Online / virtual call</SelectItem>
                  <SelectItem value="in-person meeting at the prospect's office">In-person at prospect's office</SelectItem>
                  <SelectItem value="in-person meeting at our office">In-person at our office</SelectItem>
                  <SelectItem value="booth / exhibition / trade show meet-up">Booth / exhibition / trade show</SelectItem>
                  <SelectItem value="coffee / lunch meeting">Coffee / lunch</SelectItem>
                  <SelectItem value="conference or industry event">Conference / industry event</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Who joins from our side</Label>
              <Input
                value={meetingAttendees}
                onChange={(e) => setMeetingAttendees(e.target.value)}
                placeholder="e.g. Director of Sales"
                className="mt-1 h-9"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Meeting / booth details</Label>
            <Textarea
              value={meetingDescription}
              onChange={(e) => setMeetingDescription(e.target.value)}
              rows={2}
              placeholder="e.g. Booth #42 at GITEX 2026"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Awards / credentials</Label>
            <Textarea
              value={awards}
              onChange={(e) => setAwards(e.target.value)}
              rows={2}
              placeholder="e.g. SAP Gold Partner 2025"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Signature override</Label>
            <Textarea
              value={signatureOverride}
              onChange={(e) => setSignatureOverride(e.target.value)}
              rows={3}
              placeholder={"e.g.\nJohn Perera\nDirector of Sales · Acme"}
              className="mt-1 font-mono text-xs"
            />
          </div>
        </div>

        <div>
          <Label className="text-xs">Subject</Label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject line..."
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">Body</Label>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
            placeholder="Click Generate to draft a personalized email..."
            className="mt-1"
          />
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border/60">
          <p className="text-[11px] text-muted-foreground">{body.length} characters</p>
          <Button size="sm" onClick={send} disabled={!subject && !body}>
            <Send className="h-3.5 w-3.5 mr-1.5" /> Send via {mailClient === "gmail" ? "Gmail" : mailClient === "outlook" ? "Outlook" : "mail client"}
          </Button>
        </div>

        {lead?.country && findCountry(lead.country) && (
          <div className="rounded-md border border-warm/40 bg-warm/5 p-2 text-[11px]">
            <p className="font-semibold text-primary-deep mb-0.5 flex items-center gap-1">
              <Globe className="h-3 w-3" /> Applies: {findCountry(lead.country)!.law}
            </p>
            <p className="text-muted-foreground leading-snug">
              {findCountry(lead.country)!.lawSummary}
            </p>
          </div>
        )}
      </div>

      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Conversation history
        </h4>
        <LeadConversation leadId={lead.id} />
      </div>
    </div>
  );
}
