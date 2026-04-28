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
import { Plus } from "lucide-react";
import { z } from "zod";

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
  const warnedRef = useRef(false);

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
    const { error } = await supabase.from("leads").insert({
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
    toast({ title: "Lead added", description: parsed.data.company_name });
    setCompanyName("");
    setContactName("");
    setRole("");
    setEmail("");
    setIndustry("");
    setSystemsInUse("");
    setPainPoints("");
    setNotes("");
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
