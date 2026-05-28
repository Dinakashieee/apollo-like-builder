import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { logActivity } from "@/lib/activities";
import { Mail, UserPlus, Trash2, Building2, Upload, Loader2, Sparkles } from "lucide-react";
import { z } from "zod";

const companySchema = z.object({
  company_name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).optional(),
  industries: z.string().trim().max(400).optional(),
  products_summary: z.string().trim().max(1000).optional(),
  target_systems: z.string().trim().max(400).optional(),
  solved_pain_points: z.string().trim().max(800).optional(),
  positioning: z.string().trim().max(300).optional(),
});

export default function Company() {
  const { user } = useAuth();
  const { current } = useWorkspace();
  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");
  const [industries, setIndustries] = useState("");
  const [productsSummary, setProductsSummary] = useState("");
  const [targetSystems, setTargetSystems] = useState("");
  const [solvedPainPoints, setSolvedPainPoints] = useState("");
  const [positioning, setPositioning] = useState("");
  const [members, setMembers] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [extracting, setExtracting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!current) return;
    const [{ data: company }, { data: mems }, { data: invs }] = await Promise.all([
      supabase.from("company_profiles").select("*").eq("workspace_id", current.id).maybeSingle(),
      supabase
        .from("workspace_members")
        .select("id, role, user_id, profile:profiles(full_name, email, avatar_url)")
        .eq("workspace_id", current.id),
      supabase
        .from("workspace_invites")
        .select("*")
        .eq("workspace_id", current.id)
        .is("accepted_at", null),
    ]);
    if (company) {
      setCompanyName(company.company_name ?? "");
      setDescription(company.description ?? "");
      setIndustries((company.industries ?? []).join(", "));
      setProductsSummary(company.products_summary ?? "");
      setTargetSystems((company.target_systems ?? []).join(", "));
      setSolvedPainPoints((company.solved_pain_points ?? []).join("\n"));
      setPositioning(company.positioning ?? "");
    }
    setMembers(mems ?? []);
    setInvites(invs ?? []);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  const saveCompany = async () => {
    if (!current) return;
    const parsed = companySchema.safeParse({
      company_name: companyName,
      description,
      industries,
      products_summary: productsSummary,
      target_systems: targetSystems,
      solved_pain_points: solvedPainPoints,
      positioning,
    });
    if (!parsed.success) {
      toast({ title: "Invalid", description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    const industriesArray = industries.split(",").map((s) => s.trim()).filter(Boolean);
    const targetSystemsArray = targetSystems.split(",").map((s) => s.trim()).filter(Boolean);
    const solvedPainArray = solvedPainPoints
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const { data: existing } = await supabase
      .from("company_profiles")
      .select("id")
      .eq("workspace_id", current.id)
      .maybeSingle();
    const payload = {
      workspace_id: current.id,
      company_name: parsed.data.company_name,
      description: parsed.data.description ?? null,
      industries: industriesArray,
      products_summary: parsed.data.products_summary ?? null,
      target_systems: targetSystemsArray,
      solved_pain_points: solvedPainArray,
      positioning: parsed.data.positioning ?? null,
    };
    const { error } = existing
      ? await supabase.from("company_profiles").update(payload).eq("id", existing.id)
      : await supabase.from("company_profiles").insert(payload);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    await logActivity(current.id, user?.id, "company_updated", `Company profile updated`);
    toast({ title: "Saved" });
  };

  const sendInvite = async () => {
    if (!current || !inviteEmail) return;
    const parsed = z.string().email().safeParse(inviteEmail);
    if (!parsed.success) {
      toast({ title: "Invalid email", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("workspace_invites").insert({
      workspace_id: current.id,
      email: inviteEmail.toLowerCase(),
      role: "member",
      invited_by: user!.id,
    });
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Invite created",
      description: `${inviteEmail} will join automatically when they sign up with this email.`,
    });
    setInviteEmail("");
    load();
  };

  const removeInvite = async (id: string) => {
    await supabase.from("workspace_invites").delete().eq("id", id);
    load();
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 15 MB.", variant: "destructive" });
      return;
    }
    setExtracting(true);
    try {
      const buf = await file.arrayBuffer();
      // chunked base64 encode to avoid call-stack issues on big files
      const bytes = new Uint8Array(buf);
      let binary = "";
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
      }
      const fileBase64 = btoa(binary);
      const { data, error } = await supabase.functions.invoke("parse-company-doc", {
        body: { fileBase64, mimeType: file.type || "application/octet-stream", fileName: file.name },
      });
      if (error) throw error;
      const p = (data as any)?.profile;
      if (!p) throw new Error("No profile returned");
      if (p.company_name) setCompanyName(p.company_name);
      if (p.description) setDescription(p.description);
      if (Array.isArray(p.industries) && p.industries.length) setIndustries(p.industries.join(", "));
      if (p.products_summary) setProductsSummary(p.products_summary);
      if (Array.isArray(p.target_systems) && p.target_systems.length) setTargetSystems(p.target_systems.join(", "));
      if (Array.isArray(p.solved_pain_points) && p.solved_pain_points.length)
        setSolvedPainPoints(p.solved_pain_points.join("\n"));
      if (p.positioning) setPositioning(p.positioning);
      toast({ title: "Profile extracted", description: "Review and edit, then click Save." });
    } catch (e: any) {
      toast({ title: "Extraction failed", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setExtracting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const isOwner = current?.role === "owner";

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-3xl lg:text-4xl font-display font-bold text-primary-deep">Company & Team</h1>
        <p className="text-sm text-muted-foreground mt-1">Your company profile and workspace members.</p>
      </div>

      <section className="card-elevated p-6 space-y-4">
        <h2 className="font-display font-bold text-lg text-primary-deep flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" /> Company profile
        </h2>
        <div>
          <Label>Company name</Label>
          <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Description</Label>
          <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Target industries (comma-separated)</Label>
          <Input value={industries} onChange={(e) => setIndustries(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Products / services summary</Label>
          <Textarea rows={2} value={productsSummary} onChange={(e) => setProductsSummary(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>One-line positioning</Label>
          <Input
            value={positioning}
            onChange={(e) => setPositioning(e.target.value)}
            className="mt-1"
            placeholder="e.g. IFS Premier Partner — world's #1 for IFS customer satisfaction (2023, 2024)"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Used as social proof inside AI-generated emails. Keep it factual.
          </p>
        </div>
        <div>
          <Label>Systems we replace or integrate with (comma-separated)</Label>
          <Input
            value={targetSystems}
            onChange={(e) => setTargetSystems(e.target.value)}
            className="mt-1"
            placeholder="SAP, Oracle EBS, Microsoft Dynamics, legacy ERPs"
          />
          <p className="text-xs text-muted-foreground mt-1">
            The AI uses this to say things like "we know <em>Majis</em> is using <em>SAP</em>…"
          </p>
        </div>
        <div>
          <Label>Pain points we solve (one per line)</Label>
          <Textarea
            rows={4}
            value={solvedPainPoints}
            onChange={(e) => setSolvedPainPoints(e.target.value)}
            className="mt-1"
            placeholder={`Manual data reconciliation across systems
Slow month-end close
Lack of real-time KPI visibility
Fragmented operational + financial data`}
          />
          <p className="text-xs text-muted-foreground mt-1">
            The AI matches these to the recipient's role so the email lands ("a CFO will see reconciliation; a COO will see throughput").
          </p>
        </div>
        <Button onClick={saveCompany} className="bg-gradient-primary">Save</Button>
      </section>

      <section className="card-elevated p-6 space-y-4">
        <h2 className="font-display font-bold text-lg text-primary-deep flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-primary" /> Team members
        </h2>
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 py-2 border-b last:border-0">
              <div className="h-9 w-9 rounded-full bg-gradient-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                {(m.profile?.full_name?.[0] ?? m.profile?.email?.[0] ?? "?").toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{m.profile?.full_name ?? m.profile?.email}</p>
                <p className="text-xs text-muted-foreground truncate">{m.profile?.email}</p>
              </div>
              <span className="text-[10px] font-bold uppercase bg-secondary text-secondary-foreground px-2 py-1 rounded">
                {m.role}
              </span>
            </div>
          ))}
        </div>

        {isOwner && (
          <>
            <div className="flex gap-2 pt-3 border-t">
              <Input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="teammate@company.com"
                type="email"
              />
              <Button onClick={sendInvite} className="bg-gradient-primary">
                <Mail className="h-4 w-4 mr-2" /> Invite
              </Button>
            </div>

            {invites.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                  Pending invites
                </p>
                <div className="space-y-1">
                  {invites.map((i) => (
                    <div key={i.id} className="flex items-center gap-2 py-2 px-3 rounded-lg bg-muted/50 text-sm">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="flex-1">{i.email}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeInvite(i.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
