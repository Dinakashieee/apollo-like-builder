import { useEffect, useMemo, useState } from "react";
import {
  Workflow, Mail, Clock, Sparkles, Plus, Trash2, Pencil, Play, Pause,
  UserPlus, Send, CheckCircle2, SkipForward, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { logActivity } from "@/lib/activities";
import { SenderSettingsCard } from "@/components/SenderSettingsCard";

type Sequence = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
};

type Step = {
  id: string;
  sequence_id: string;
  step_order: number;
  day_offset: number;
  subject_template: string;
  body_template: string;
};

type Lead = {
  id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  role: string | null;
};

type Enrollment = {
  id: string;
  sequence_id: string;
  lead_id: string;
  status: "active" | "paused" | "completed" | "stopped";
  enrolled_at: string;
};

type DueRow = {
  status_id: string;
  enrollment_id: string;
  step_id: string;
  due_at: string;
  status: "pending" | "sent" | "skipped";
  sequence_name: string;
  step_order: number;
  subject_template: string;
  body_template: string;
  lead: Lead;
};

const DEFAULT_CADENCE: Omit<Step, "id" | "sequence_id">[] = [
  {
    step_order: 1, day_offset: 0,
    subject_template: "Quick idea for {{company}}",
    body_template: "Hi {{contact}},\n\nI came across {{company}} and had a quick thought on how we might help. Open to a short chat?\n\nThanks,",
  },
  {
    step_order: 2, day_offset: 3,
    subject_template: "Re: Quick idea for {{company}}",
    body_template: "Hi {{contact}},\n\nJust circling back on my note above — happy to share a 2-min overview if useful.\n\nThanks,",
  },
  {
    step_order: 3, day_offset: 8,
    subject_template: "One case study you might like",
    body_template: "Hi {{contact}},\n\nSharing a quick example of results we drove for a similar team. Worth 10 minutes next week?\n\nThanks,",
  },
  {
    step_order: 4, day_offset: 18,
    subject_template: "Closing the loop",
    body_template: "Hi {{contact}},\n\nI'll stop reaching out for now — if priorities shift, just reply here and I'll pick it back up.\n\nAll the best,",
  },
];

function fillTemplate(t: string, lead: Lead) {
  return t
    .replace(/\{\{company\}\}/g, lead.company_name || "")
    .replace(/\{\{contact\}\}/g, lead.contact_name || "there")
    .replace(/\{\{role\}\}/g, lead.role || "");
}

export default function Automation() {
  const { current } = useWorkspace();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [due, setDue] = useState<DueRow[]>([]);
  const [seeding, setSeeding] = useState(false);

  // editor state
  const [editingSeq, setEditingSeq] = useState<Sequence | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editSteps, setEditSteps] = useState<Step[]>([]);

  // enroll state
  const [enrollSeq, setEnrollSeq] = useState<Sequence | null>(null);
  const [enrollLeadId, setEnrollLeadId] = useState<string>("");

  const refresh = async () => {
    if (!current) return;
    setLoading(true);
    const [seqRes, leadRes, enrRes] = await Promise.all([
      supabase.from("sequences").select("*").eq("workspace_id", current.id).order("created_at"),
      supabase.from("leads").select("id, company_name, contact_name, email, role").eq("workspace_id", current.id).order("created_at", { ascending: false }),
      supabase.from("sequence_enrollments").select("*").eq("workspace_id", current.id).order("created_at", { ascending: false }),
    ]);
    const seqs = (seqRes.data as Sequence[]) ?? [];
    setSequences(seqs);
    setLeads((leadRes.data as Lead[]) ?? []);
    setEnrollments((enrRes.data as Enrollment[]) ?? []);

    if (seqs.length > 0) {
      const stepRes = await supabase.from("sequence_steps").select("*").in("sequence_id", seqs.map(s => s.id)).order("step_order");
      setSteps((stepRes.data as Step[]) ?? []);
    } else {
      setSteps([]);
    }
    await refreshDue(seqs);
    setLoading(false);
  };

  const refreshDue = async (seqs?: Sequence[]) => {
    if (!current) return;
    const { data: statusRows } = await supabase
      .from("sequence_step_status")
      .select("id, enrollment_id, step_id, due_at, status")
      .eq("workspace_id", current.id)
      .order("due_at");
    const rows = statusRows ?? [];
    if (rows.length === 0) { setDue([]); return; }

    const stepIds = [...new Set(rows.map(r => r.step_id))];
    const enrIds = [...new Set(rows.map(r => r.enrollment_id))];
    const [stepsRes, enrRes2] = await Promise.all([
      supabase.from("sequence_steps").select("*").in("id", stepIds),
      supabase.from("sequence_enrollments").select("*").in("id", enrIds),
    ]);
    const stepMap = new Map<string, Step>(((stepsRes.data as Step[]) ?? []).map(s => [s.id, s]));
    const enrMap = new Map<string, Enrollment>(((enrRes2.data as Enrollment[]) ?? []).map(e => [e.id, e]));
    const seqMap = new Map<string, string>((seqs ?? sequences).map(s => [s.id, s.name]));
    const leadIds = [...new Set([...enrMap.values()].map(e => e.lead_id))];
    const leadRes = await supabase.from("leads").select("id, company_name, contact_name, email, role").in("id", leadIds);
    const leadMap = new Map<string, Lead>(((leadRes.data as Lead[]) ?? []).map(l => [l.id, l]));

    const out: DueRow[] = [];
    for (const r of rows) {
      const st = stepMap.get(r.step_id);
      const en = enrMap.get(r.enrollment_id);
      if (!st || !en) continue;
      const lead = leadMap.get(en.lead_id);
      if (!lead) continue;
      out.push({
        status_id: r.id,
        enrollment_id: r.enrollment_id,
        step_id: r.step_id,
        due_at: r.due_at,
        status: r.status as DueRow["status"],
        sequence_name: seqMap.get(en.sequence_id) ?? "Sequence",
        step_order: st.step_order,
        subject_template: st.subject_template,
        body_template: st.body_template,
        lead,
      });
    }
    setDue(out);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [current?.id]);

  const seedDefault = async () => {
    if (!current) return;
    setSeeding(true);
    const { data: seq, error } = await supabase
      .from("sequences")
      .insert({ workspace_id: current.id, name: "Default outreach", description: "Our launch cadence — 4 touches over ~18 days." })
      .select().single();
    if (error || !seq) {
      setSeeding(false);
      toast({ title: "Could not create sequence", description: error?.message, variant: "destructive" });
      return;
    }
    const rows = DEFAULT_CADENCE.map(s => ({ ...s, sequence_id: seq.id, workspace_id: current.id }));
    await supabase.from("sequence_steps").insert(rows);
    await logActivity(current.id, user?.id, "sequence_created", `Created sequence "${seq.name}"`);
    toast({ title: "Default sequence created" });
    setSeeding(false);
    refresh();
  };

  const openEditor = (seq: Sequence) => {
    setEditingSeq(seq);
    setEditName(seq.name);
    setEditDesc(seq.description ?? "");
    setEditSteps(steps.filter(s => s.sequence_id === seq.id).sort((a,b) => a.step_order - b.step_order));
  };

  const createBlank = async () => {
    if (!current) return;
    const { data, error } = await supabase
      .from("sequences")
      .insert({ workspace_id: current.id, name: "New sequence", description: "" })
      .select().single();
    if (error || !data) {
      toast({ title: "Could not create", description: error?.message, variant: "destructive" }); return;
    }
    await refresh();
    openEditor(data as Sequence);
  };

  const saveEditor = async () => {
    if (!editingSeq || !current) return;
    await supabase.from("sequences").update({ name: editName, description: editDesc }).eq("id", editingSeq.id);
    // delete removed steps, upsert remaining
    const existingIds = steps.filter(s => s.sequence_id === editingSeq.id).map(s => s.id);
    const keepIds = editSteps.filter(s => !s.id.startsWith("new-")).map(s => s.id);
    const toDelete = existingIds.filter(id => !keepIds.includes(id));
    if (toDelete.length) await supabase.from("sequence_steps").delete().in("id", toDelete);
    for (const [i, s] of editSteps.entries()) {
      const payload = {
        sequence_id: editingSeq.id,
        workspace_id: current.id,
        step_order: i + 1,
        day_offset: s.day_offset,
        subject_template: s.subject_template,
        body_template: s.body_template,
      };
      if (s.id.startsWith("new-")) {
        await supabase.from("sequence_steps").insert(payload);
      } else {
        await supabase.from("sequence_steps").update(payload).eq("id", s.id);
      }
    }
    toast({ title: "Saved" });
    setEditingSeq(null);
    refresh();
  };

  const addStep = () => {
    setEditSteps(prev => [...prev, {
      id: `new-${Date.now()}`,
      sequence_id: editingSeq!.id,
      step_order: prev.length + 1,
      day_offset: prev.length === 0 ? 0 : (prev[prev.length-1].day_offset + 3),
      subject_template: "",
      body_template: "",
    }]);
  };

  const updateStep = (i: number, patch: Partial<Step>) => {
    setEditSteps(prev => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s));
  };

  const removeStep = (i: number) => {
    setEditSteps(prev => prev.filter((_, idx) => idx !== i));
  };

  const toggleActive = async (seq: Sequence) => {
    await supabase.from("sequences").update({ active: !seq.active }).eq("id", seq.id);
    refresh();
  };

  const deleteSequence = async (seq: Sequence) => {
    if (!confirm(`Delete "${seq.name}"? Enrollments will be removed.`)) return;
    await supabase.from("sequences").delete().eq("id", seq.id);
    refresh();
  };

  const enroll = async () => {
    if (!current || !enrollSeq || !enrollLeadId) return;
    const seqSteps = steps.filter(s => s.sequence_id === enrollSeq.id).sort((a,b) => a.step_order - b.step_order);
    if (seqSteps.length === 0) {
      toast({ title: "Add steps first", variant: "destructive" }); return;
    }
    const { data: enr, error } = await supabase
      .from("sequence_enrollments")
      .insert({ workspace_id: current.id, sequence_id: enrollSeq.id, lead_id: enrollLeadId })
      .select().single();
    if (error || !enr) {
      toast({ title: "Could not enroll", description: error?.message, variant: "destructive" }); return;
    }
    const now = Date.now();
    const statusRows = seqSteps.map(s => ({
      enrollment_id: enr.id,
      step_id: s.id,
      workspace_id: current.id,
      due_at: new Date(now + s.day_offset * 86400000).toISOString(),
    }));
    await supabase.from("sequence_step_status").insert(statusRows);
    await logActivity(current.id, user?.id, "sequence_enrolled", `Enrolled lead in "${enrollSeq.name}"`);
    toast({ title: "Lead enrolled" });
    setEnrollSeq(null); setEnrollLeadId("");
    refresh();
  };

  const sendStep = async (row: DueRow) => {
    const subject = fillTemplate(row.subject_template, row.lead);
    const body = fillTemplate(row.body_template, row.lead);
    const to = row.lead.email ?? "";
    const url = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url, "_blank");
    await markStep(row, "sent");
  };

  const markStep = async (row: DueRow, status: "sent" | "skipped") => {
    if (!current) return;
    await supabase
      .from("sequence_step_status")
      .update({ status, sent_at: status === "sent" ? new Date().toISOString() : null })
      .eq("id", row.status_id);

    // if last step done, mark enrollment complete
    const { data: remaining } = await supabase
      .from("sequence_step_status")
      .select("id")
      .eq("enrollment_id", row.enrollment_id)
      .eq("status", "pending");
    if (!remaining || remaining.length === 0) {
      await supabase.from("sequence_enrollments")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", row.enrollment_id);
    }
    refreshDue();
  };

  const enrollmentsBySeq = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of enrollments) m.set(e.sequence_id, (m.get(e.sequence_id) ?? 0) + 1);
    return m;
  }, [enrollments]);

  const dueNow = due.filter(d => d.status === "pending" && new Date(d.due_at) <= new Date());
  const upcoming = due.filter(d => d.status === "pending" && new Date(d.due_at) > new Date());
  const recentlyDone = due.filter(d => d.status !== "pending").slice(0, 20);

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm text-primary font-medium mb-1 flex items-center gap-1.5">
            <Workflow className="h-3.5 w-3.5" /> Sequences
          </p>
          <h1 className="text-3xl lg:text-4xl font-display font-bold text-primary-deep">
            Follow-Up Automation
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Multi-step outreach cadences. Enroll a lead, action each step when it's due.
          </p>
        </div>
        <div className="flex gap-2">
          {sequences.length === 0 && (
            <Button onClick={seedDefault} disabled={seeding} variant="outline">
              {seeding ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
              Use default cadence
            </Button>
          )}
          <Button onClick={createBlank}><Plus className="h-4 w-4 mr-1" />New sequence</Button>
        </div>
      </div>

      <Tabs defaultValue="inbox" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inbox">
            Action inbox {dueNow.length > 0 && <Badge className="ml-2" variant="default">{dueNow.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="sequences">Sequences ({sequences.length})</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="space-y-3">
          {loading ? (
            <div className="text-sm text-muted-foreground p-6">Loading…</div>
          ) : dueNow.length === 0 ? (
            <div className="card-elevated p-8 text-center text-sm text-muted-foreground">
              <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Nothing due right now. Enroll a lead from the Sequences tab.
            </div>
          ) : dueNow.map(row => (
            <div key={row.status_id} className="card-elevated p-4 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-semibold text-sm text-primary-deep">
                    {row.lead.contact_name || row.lead.company_name}
                    <span className="text-muted-foreground font-normal"> · {row.lead.company_name}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {row.sequence_name} · Step {row.step_order} · Due {new Date(row.due_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => markStep(row, "skipped")}>
                    <SkipForward className="h-3.5 w-3.5 mr-1" />Skip
                  </Button>
                  <Button size="sm" onClick={() => sendStep(row)} disabled={!row.lead.email}>
                    <Send className="h-3.5 w-3.5 mr-1" />
                    {row.lead.email ? "Send via mail client" : "No email"}
                  </Button>
                </div>
              </div>
              <div className="text-xs bg-muted/40 rounded-lg p-3 space-y-1">
                <p className="font-medium">{fillTemplate(row.subject_template, row.lead)}</p>
                <p className="whitespace-pre-line text-muted-foreground line-clamp-4">{fillTemplate(row.body_template, row.lead)}</p>
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="sequences" className="space-y-3">
          {sequences.length === 0 ? (
            <div className="card-elevated p-8 text-center text-sm text-muted-foreground">
              No sequences yet. Create one or load the default cadence above.
            </div>
          ) : sequences.map(seq => {
            const seqSteps = steps.filter(s => s.sequence_id === seq.id);
            return (
              <div key={seq.id} className="card-elevated p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-bold text-lg text-primary-deep">{seq.name}</h3>
                      <Badge variant={seq.active ? "default" : "secondary"}>{seq.active ? "Active" : "Paused"}</Badge>
                    </div>
                    {seq.description && <p className="text-xs text-muted-foreground mt-0.5">{seq.description}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      {seqSteps.length} steps · {enrollmentsBySeq.get(seq.id) ?? 0} enrolled
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => { setEnrollSeq(seq); setEnrollLeadId(""); }}>
                      <UserPlus className="h-3.5 w-3.5 mr-1" />Enroll lead
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toggleActive(seq)}>
                      {seq.active ? <Pause className="h-3.5 w-3.5 mr-1" /> : <Play className="h-3.5 w-3.5 mr-1" />}
                      {seq.active ? "Pause" : "Activate"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openEditor(seq)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" />Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteSequence(seq)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>

                {seqSteps.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {seqSteps.sort((a,b) => a.step_order - b.step_order).map(s => (
                      <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/60 text-sm">
                        <div className="h-7 w-7 rounded-md bg-gradient-primary flex items-center justify-center shrink-0">
                          <Clock className="h-3.5 w-3.5 text-primary-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{s.subject_template || <span className="text-muted-foreground italic">Empty subject</span>}</p>
                        </div>
                        <Badge variant="secondary" className="shrink-0">+{s.day_offset}d</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-2">
          {upcoming.length === 0 ? (
            <div className="card-elevated p-8 text-center text-sm text-muted-foreground">No upcoming steps.</div>
          ) : upcoming.map(row => (
            <div key={row.status_id} className="card-elevated p-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="text-sm">
                <span className="font-medium">{row.lead.contact_name || row.lead.company_name}</span>
                <span className="text-muted-foreground"> · {row.sequence_name} · Step {row.step_order}</span>
              </div>
              <Badge variant="outline">{new Date(row.due_at).toLocaleDateString()}</Badge>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="history" className="space-y-2">
          {recentlyDone.length === 0 ? (
            <div className="card-elevated p-8 text-center text-sm text-muted-foreground">No history yet.</div>
          ) : recentlyDone.map(row => (
            <div key={row.status_id} className="card-elevated p-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="text-sm flex items-center gap-2">
                {row.status === "sent" ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <SkipForward className="h-4 w-4 text-muted-foreground" />}
                <span className="font-medium">{row.lead.contact_name || row.lead.company_name}</span>
                <span className="text-muted-foreground">· {row.sequence_name} · Step {row.step_order}</span>
              </div>
              <Badge variant={row.status === "sent" ? "default" : "secondary"}>{row.status}</Badge>
            </div>
          ))}
        </TabsContent>
      </Tabs>

      {/* Editor */}
      <Dialog open={!!editingSeq} onOpenChange={(o) => !o && setEditingSeq(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit sequence</DialogTitle>
            <DialogDescription>Use {"{{contact}}"}, {"{{company}}"}, {"{{role}}"} as placeholders.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={editDesc} onChange={e => setEditDesc(e.target.value)} />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Steps</Label>
                <Button size="sm" variant="outline" onClick={addStep}><Plus className="h-3.5 w-3.5 mr-1" />Add step</Button>
              </div>
              {editSteps.map((s, i) => (
                <div key={s.id} className="border border-border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">Step {i + 1}</span>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Days from start</Label>
                      <Input
                        type="number" min={0} className="w-20 h-8"
                        value={s.day_offset}
                        onChange={e => updateStep(i, { day_offset: Math.max(0, parseInt(e.target.value || "0")) })}
                      />
                      <Button size="icon" variant="ghost" onClick={() => removeStep(i)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <Input placeholder="Subject" value={s.subject_template} onChange={e => updateStep(i, { subject_template: e.target.value })} />
                  <Textarea placeholder="Body" rows={4} value={s.body_template} onChange={e => updateStep(i, { body_template: e.target.value })} />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSeq(null)}>Cancel</Button>
            <Button onClick={saveEditor}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enroll */}
      <Dialog open={!!enrollSeq} onOpenChange={(o) => !o && setEnrollSeq(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enroll lead in "{enrollSeq?.name}"</DialogTitle>
            <DialogDescription>The first step becomes due immediately; later steps are scheduled by the day offsets.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Lead</Label>
            <Select value={enrollLeadId} onValueChange={setEnrollLeadId}>
              <SelectTrigger><SelectValue placeholder="Pick a lead" /></SelectTrigger>
              <SelectContent>
                {leads.map(l => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.contact_name ? `${l.contact_name} — ${l.company_name}` : l.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {leads.length === 0 && <p className="text-xs text-muted-foreground">No leads yet. Add one from the Leads page.</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrollSeq(null)}>Cancel</Button>
            <Button onClick={enroll} disabled={!enrollLeadId}>Enroll</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
