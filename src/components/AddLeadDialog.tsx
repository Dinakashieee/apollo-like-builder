import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useEntitlements } from "@/hooks/useEntitlements";
import { UpgradeModal } from "@/components/UpgradeModal";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/activities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Sparkles, Loader2, Globe } from "lucide-react";
import { z } from "zod";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { COUNTRIES, findCountry, guessCountryFromEmail } from "@/lib/countries";

const schema = z.object({
  company_name: z.string().trim().min(1, "Company required").max(120),
  contact_name: z.string().trim().max(80).optional(),
  role: z.string().trim().max(80).optional(),
  email: z.string().trim().email().max(120).optional().or(z.literal("")),
  industry: z.string().trim().max(80).optional(),
  systems_in_use: z.string().trim().max(300).optional(),
  pain_points: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export function AddLeadDialog({ onCreated }: { onCreated?: () => void }) {
  const { user } = useAuth();
  const { current } = useWorkspace();
  const { leadsUsed, leadsLimit, leadsAtLimit, leadsNearLimit, tier, refetch: refetchUsage } =
    useEntitlements();
  const [open, setOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [industry, setIndustry] = useState("");
  const [systemsInUse, setSystemsInUse] = useState("");
  const [painPoints, setPainPoints] = useState("");
  const [notes, setNotes] = useState("");
  const [enriching, setEnriching] = useState(false);
  const [enrichSignals, setEnrichSignals] = useState<string[]>([]);
  const [enrichConfidence, setEnrichConfidence] = useState<string | null>(null);
  const warnedRef = useRef(false);

  const mergeUnique = (existing: string, additions: string[]) => {
    const set = new Set(
      existing.split(",").map((s) => s.trim()).filter(Boolean).map((s) => s.toLowerCase()),
    );
    const out = existing.split(",").map((s) => s.trim()).filter(Boolean);
    for (const a of additions) {
      const k = a.trim();
      if (k && !set.has(k.toLowerCase())) {
        set.add(k.toLowerCase());
        out.push(k);
      }
    }
    return out.join(", ");
  };

  const handleAutoFind = async () => {
    if (!companyName.trim()) {
      toast({ title: "Company required", description: "Enter a company name first.", variant: "destructive" });
      return;
    }
    setEnriching(true);
    setEnrichSignals([]);
    setEnrichConfidence(null);
    try {
      const { data, error } = await supabase.functions.invoke("enrich-lead", {
        body: {
          company_name: companyName.trim(),
          industry: industry.trim() || undefined,
          contact_name: contactName.trim() || undefined,
          role: role.trim() || undefined,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const systems: string[] = (data as any)?.systems_in_use ?? [];
      const pains: string[] = (data as any)?.pain_points ?? [];
      setSystemsInUse((prev) => mergeUnique(prev, systems));
      setPainPoints((prev) => mergeUnique(prev, pains));
      setEnrichSignals((data as any)?.signals ?? []);
      setEnrichConfidence((data as any)?.confidence ?? null);
      toast({
        title: "Enriched from AI signals",
        description: `${systems.length} systems · ${pains.length} pain points`,
      });
    } catch (e: any) {
      toast({ title: "Auto-find failed", description: e?.message ?? "Try again later", variant: "destructive" });
    } finally {
      setEnriching(false);
    }
  };


  useEffect(() => {
    if (leadsNearLimit && !warnedRef.current && tier !== "pro") {
      warnedRef.current = true;
      toast({
        title: "You're nearing your plan limit",
        description: `${leadsUsed} of ${leadsLimit} leads used. Consider upgrading.`,
      });
    }
  }, [leadsNearLimit, leadsUsed, leadsLimit, tier]);

  const handleTriggerClick = (e: React.MouseEvent) => {
    if (leadsAtLimit) {
      e.preventDefault();
      setUpgradeOpen(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!current) return;
    if (leadsAtLimit) {
      setOpen(false);
      setUpgradeOpen(true);
      return;
    }
    const parsed = schema.safeParse({
      company_name: companyName,
      contact_name: contactName,
      role,
      email,
      industry,
      systems_in_use: systemsInUse,
      pain_points: painPoints,
      notes,
    });
    if (!parsed.success) {
      toast({ title: "Invalid input", description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    const toArray = (s?: string) =>
      (s ?? "").split(",").map((x) => x.trim()).filter(Boolean);
    setSubmitting(true);
    const leadId = crypto.randomUUID();
    const { error } = await supabase.from("leads").insert({
      id: leadId,
      workspace_id: current.id,
      company_name: parsed.data.company_name,
      contact_name: parsed.data.contact_name || null,
      role: parsed.data.role || null,
      email: parsed.data.email || null,
      industry: parsed.data.industry || null,
      systems_in_use: toArray(parsed.data.systems_in_use),
      pain_points: toArray(parsed.data.pain_points),
      notes: parsed.data.notes || null,
      status: "new",
      created_by: user?.id,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Could not add lead", description: error.message, variant: "destructive" });
      return;
    }
    await logActivity(current.id, user?.id, "lead_added", `Lead added: ${parsed.data.company_name}`);
    // Notify the workspace user that a lead was added
    if (user?.email) {
      supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "lead-added",
          recipientEmail: user.email,
          idempotencyKey: `lead-added-${leadId}`,
          templateData: {
            recipientName: user.user_metadata?.full_name ?? null,
            leadName: parsed.data.contact_name || parsed.data.company_name,
            leadCompany: parsed.data.company_name,
            leadRole: parsed.data.role || null,
          },
        },
      }).catch(() => {});
    }
    toast({ title: "Lead added", description: parsed.data.company_name });
    setCompanyName("");
    setContactName("");
    setRole("");
    setEmail("");
    setIndustry("");
    setSystemsInUse("");
    setPainPoints("");
    setNotes("");
    setEnrichSignals([]);
    setEnrichConfidence(null);
    setOpen(false);
    refetchUsage();
    onCreated?.();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm" className="bg-gradient-primary shadow-glow" onClick={handleTriggerClick}>
            <Plus className="h-4 w-4 mr-2" /> Add Lead
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a new lead</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Company *</Label>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Contact name</Label>
                <Input value={contactName} onChange={(e) => setContactName(e.target.value)} />
              </div>
              <div>
                <Label>Role</Label>
                <Input value={role} onChange={(e) => setRole(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Industry</Label>
                <Input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. Manufacturing" />
              </div>
              <div>
                <Label>Systems in use</Label>
                <Input
                  value={systemsInUse}
                  onChange={(e) => setSystemsInUse(e.target.value)}
                  placeholder="SAP, Oracle, Salesforce"
                />
              </div>
            </div>
            <div>
              <Label>Known pain points (comma-separated)</Label>
              <Input
                value={painPoints}
                onChange={(e) => setPainPoints(e.target.value)}
                placeholder="manual reconciliation, slow month-end close"
              />
            </div>
            <div className="rounded-lg border border-dashed p-3 space-y-2 bg-muted/30">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground">
                  Don't know the systems or pain points? Let AI infer them from public signals
                  (job posts, news, leadership changes).
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAutoFind}
                  disabled={enriching || !companyName.trim()}
                >
                  {enriching ? (
                    <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Finding…</>
                  ) : (
                    <><Sparkles className="h-3.5 w-3.5 mr-1.5" /> Auto-find from web</>
                  )}
                </Button>
              </div>
              {(enrichSignals.length > 0 || enrichConfidence) && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {enrichConfidence && (
                    <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                      {enrichConfidence} confidence
                    </span>
                  )}
                  {enrichSignals.map((s, i) => (
                    <span key={i} className="text-[11px] px-1.5 py-0.5 rounded bg-background border text-muted-foreground">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={submitting} className="bg-gradient-primary">
                {submitting ? "Adding..." : "Add lead"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        title="Lead limit reached"
        description={`You've used ${leadsUsed} of ${leadsLimit} leads on the ${tier} plan. Upgrade to add more.`}
      />
    </>
  );
}
