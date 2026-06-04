import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Copy, ExternalLink, Plus, Trash2, Eye, MousePointerClick, Clock, Users } from "lucide-react";

type Lead = { id: string; contact_name: string | null; company_name: string | null };
export type CTA = { label: string; url: string; style: "primary" | "secondary" | "outline" };
type Page = {
  id: string;
  slug: string;
  title: string;
  template: string;
  prospect_name: string | null;
  prospect_company: string | null;
  headline: string | null;
  subheadline: string | null;
  body: string | null;
  cta_label: string | null;
  cta_url: string | null;
  ctas: CTA[];
  logo_url: string | null;
  accent_color: string | null;
  lead_id: string | null;
  published: boolean;
  created_at: string;
};

const TEMPLATES = [
  { id: "minimal", name: "Minimal", desc: "Clean & focused" },
  { id: "bold", name: "Bold Gradient", desc: "Eye-catching hero" },
  { id: "split", name: "Split", desc: "Two-column layout" },
];

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40);
}

export default function LandingPages() {
  const { current } = useWorkspace();
  const { user } = useAuth();
  const [pages, setPages] = useState<Page[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Page | null>(null);

  const load = async () => {
    if (!current) return;
    setLoading(true);
    const [{ data: ps }, { data: ls }] = await Promise.all([
      supabase.from("landing_pages").select("*").eq("workspace_id", current.id).order("created_at", { ascending: false }),
      supabase.from("leads").select("id,contact_name,company_name").eq("workspace_id", current.id).order("created_at", { ascending: false }).limit(500),
    ]);
    setPages(((ps as any[]) || []).map((p) => ({ ...p, ctas: Array.isArray(p.ctas) ? p.ctas : [] })));
    setLeads((ls as Lead[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [current?.id]);

  const baseUrl = `${window.location.origin}/p/`;

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(baseUrl + slug);
    toast({ title: "Link copied" });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this page?")) return;
    await supabase.from("landing_pages").delete().eq("id", id);
    toast({ title: "Page deleted" });
    load();
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Personalized Landing Pages</h1>
          <p className="text-muted-foreground mt-1">Build custom pages for prospects and track who engages.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New page
        </Button>
      </div>

      {loading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : pages.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground mb-4">No landing pages yet. Create your first personalized page.</p>
            <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Create page</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pages.map((p) => (
            <PageCard key={p.id} page={p} onOpen={() => setEditing(p)} onCopy={() => copyLink(p.slug)} onDelete={() => remove(p.id)} baseUrl={baseUrl} />
          ))}
        </div>
      )}

      <CreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        leads={leads}
        workspaceId={current?.id}
        userId={user?.id}
        onCreated={(p) => { setCreateOpen(false); load(); setEditing(p); }}
      />

      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {editing && (
            <EditorPanel page={editing} leads={leads} onSaved={() => load()} onClose={() => setEditing(null)} />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function PageCard({ page, onOpen, onCopy, onDelete, baseUrl }: { page: Page; onOpen: () => void; onCopy: () => void; onDelete: () => void; baseUrl: string }) {
  const [stats, setStats] = useState({ views: 0, unique: 0, clicks: 0 });
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("landing_page_views")
        .select("visitor_id,cta_clicked")
        .eq("page_id", page.id);
      const rows = data || [];
      const unique = new Set(rows.map((r: any) => r.visitor_id).filter(Boolean)).size;
      setStats({
        views: rows.length,
        unique,
        clicks: rows.filter((r: any) => r.cta_clicked).length,
      });
    })();
  }, [page.id]);
  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base truncate">{page.title}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1 truncate">/p/{page.slug}</p>
          </div>
          <Badge variant={page.published ? "default" : "secondary"}>{page.published ? "Live" : "Draft"}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat icon={Eye} label="Views" value={stats.views} />
          <Stat icon={Users} label="Unique" value={stats.unique} />
          <Stat icon={MousePointerClick} label="Clicks" value={stats.clicks} />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1" onClick={onOpen}>Edit</Button>
          <Button size="sm" variant="outline" onClick={onCopy}><Copy className="h-3.5 w-3.5" /></Button>
          <Button size="sm" variant="outline" asChild>
            <a href={baseUrl + page.slug} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
          </Button>
          <Button size="sm" variant="outline" onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: number | string }) {
  return (
    <div className="rounded-md bg-muted/40 py-2">
      <Icon className="h-3.5 w-3.5 mx-auto text-muted-foreground" />
      <div className="text-lg font-semibold leading-tight mt-0.5">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function CreateDialog({ open, onOpenChange, leads, workspaceId, userId, onCreated }: any) {
  const [title, setTitle] = useState("");
  const [template, setTemplate] = useState("minimal");
  const [leadId, setLeadId] = useState<string>("none");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setTitle(""); setTemplate("minimal"); setLeadId("none"); } }, [open]);

  const submit = async () => {
    if (!workspaceId || !userId || !title.trim()) return;
    setSaving(true);
    const lead = leads.find((l: Lead) => l.id === leadId);
    const slug = `${slugify(title)}-${Math.random().toString(36).slice(2, 7)}`;
    const { data, error } = await supabase
      .from("landing_pages")
      .insert({
        workspace_id: workspaceId,
        created_by: userId,
        title: title.trim(),
        template,
        slug,
        lead_id: leadId === "none" ? null : leadId,
        prospect_name: lead?.contact_name || null,
        prospect_company: lead?.company_name || null,
        headline: `Hi {name}, this is for {company}`,
        subheadline: `A quick look at how we can help you grow.`,
        body: `Hi {name},\n\nWe put together this page just for {company}. Let us know what you think.`,
        cta_label: null,
        cta_url: null,
        ctas: [{ label: "Book a call", url: "https://", style: "primary" }] as any,
        accent_color: "#6366f1",
      })
      .select()
      .maybeSingle();
    setSaving(false);
    if (error) { toast({ title: "Failed to create", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Page created" });
    onCreated(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>New landing page</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Page title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Proposal for Acme" />
          </div>
          <div>
            <Label>Template</Label>
            <Select value={template} onValueChange={setTemplate}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TEMPLATES.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name} — {t.desc}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Link to lead (optional)</Label>
            <Select value={leadId} onValueChange={setLeadId}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {leads.map((l: Lead) => (
                  <SelectItem key={l.id} value={l.id}>{l.contact_name || "Unnamed"} {l.company_name ? `— ${l.company_name}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !title.trim()}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditorPanel({ page, leads, onSaved, onClose }: { page: Page; leads: Lead[]; onSaved: () => void; onClose: () => void }) {
  const [p, setP] = useState<Page>(page);
  const [saving, setSaving] = useState(false);
  useEffect(() => setP(page), [page.id]);
  const set = (k: keyof Page, v: any) => setP((x) => ({ ...x, [k]: v }));

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("landing_pages")
      .update({
        title: p.title,
        template: p.template,
        prospect_name: p.prospect_name,
        prospect_company: p.prospect_company,
        headline: p.headline,
        subheadline: p.subheadline,
        body: p.body,
        cta_label: p.cta_label,
        cta_url: p.cta_url,
        ctas: p.ctas as any,
        logo_url: p.logo_url,
        accent_color: p.accent_color,
        lead_id: p.lead_id,
        published: p.published,
        slug: p.slug,
      })
      .eq("id", p.id);
    setSaving(false);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Saved" });
    onSaved();
  };

  const url = `${window.location.origin}/p/${p.slug}`;

  return (
    <>
      <SheetHeader>
        <SheetTitle>{p.title}</SheetTitle>
        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
          <a href={url} target="_blank" rel="noreferrer" className="underline truncate">{url}</a>
          <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(url); toast({ title: "Link copied" }); }}>
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      </SheetHeader>

      <Tabs defaultValue="content" className="mt-4">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="ctas">CTAs</TabsTrigger>
          <TabsTrigger value="design">Design</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-4 mt-4">
          <Field label="Title"><Input value={p.title} onChange={(e) => set("title", e.target.value)} /></Field>
          <Field label="URL slug"><Input value={p.slug} onChange={(e) => set("slug", slugify(e.target.value))} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prospect name (used by {name})"><Input value={p.prospect_name || ""} onChange={(e) => set("prospect_name", e.target.value)} /></Field>
            <Field label="Prospect company (used by {company})"><Input value={p.prospect_company || ""} onChange={(e) => set("prospect_company", e.target.value)} /></Field>
          </div>
          <Field label="Link to lead">
            <Select value={p.lead_id || "none"} onValueChange={(v) => set("lead_id", v === "none" ? null : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {leads.map((l) => <SelectItem key={l.id} value={l.id}>{l.contact_name || "Unnamed"} {l.company_name ? `— ${l.company_name}` : ""}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Headline"><Input value={p.headline || ""} onChange={(e) => set("headline", e.target.value)} placeholder="Hi {name}, …" /></Field>
          <Field label="Subheadline"><Input value={p.subheadline || ""} onChange={(e) => set("subheadline", e.target.value)} /></Field>
          <Field label="Body"><Textarea rows={6} value={p.body || ""} onChange={(e) => set("body", e.target.value)} /></Field>
          <p className="text-xs text-muted-foreground">Tip: use <code className="bg-muted px-1 rounded">{"{name}"}</code> and <code className="bg-muted px-1 rounded">{"{company}"}</code> as personalization tokens.</p>
        </TabsContent>

        <TabsContent value="ctas" className="space-y-3 mt-4">
          <CtaBuilder ctas={p.ctas} onChange={(v) => set("ctas", v)} accent={p.accent_color || "#6366f1"} />
        </TabsContent>

        <TabsContent value="design" className="space-y-4 mt-4">
          <Field label="Template">
            <Select value={p.template} onValueChange={(v) => set("template", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TEMPLATES.map((t) => <SelectItem key={t.id} value={t.id}>{t.name} — {t.desc}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Logo URL"><Input value={p.logo_url || ""} onChange={(e) => set("logo_url", e.target.value)} placeholder="https://…/logo.png" /></Field>
          <Field label="Accent color">
            <div className="flex gap-2 items-center">
              <Input type="color" value={p.accent_color || "#6366f1"} onChange={(e) => set("accent_color", e.target.value)} className="w-16 h-10 p-1" />
              <Input value={p.accent_color || ""} onChange={(e) => set("accent_color", e.target.value)} />
            </div>
          </Field>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label>Published</Label>
              <p className="text-xs text-muted-foreground">When off, the public URL returns "not found".</p>
            </div>
            <Switch checked={p.published} onCheckedChange={(v) => set("published", v)} />
          </div>
        </TabsContent>

        <TabsContent value="stats" className="mt-4">
          <StatsPanel pageId={p.id} />
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>Close</Button>
        <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function StatsPanel({ pageId }: { pageId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("landing_page_views")
        .select("*")
        .eq("page_id", pageId)
        .order("created_at", { ascending: false })
        .limit(200);
      setRows(data || []);
      setLoading(false);
    })();
  }, [pageId]);

  const totals = useMemo(() => {
    const unique = new Set(rows.map((r) => r.visitor_id).filter(Boolean)).size;
    const clicks = rows.filter((r) => r.cta_clicked).length;
    const avg = rows.length ? Math.round(rows.reduce((s, r) => s + (r.duration_ms || 0), 0) / rows.length / 1000) : 0;
    return { views: rows.length, unique, clicks, avg };
  }, [rows]);

  if (loading) return <p className="text-muted-foreground text-sm">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2">
        <Stat icon={Eye} label="Views" value={totals.views} />
        <Stat icon={Users} label="Unique" value={totals.unique} />
        <Stat icon={MousePointerClick} label="Clicks" value={totals.clicks} />
        <Stat icon={Clock} label="Avg sec" value={totals.avg} />
      </div>
      <div className="border rounded-md divide-y">
        {rows.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">No visits yet. Share the link to start tracking.</div>
        ) : rows.map((r) => (
          <div key={r.id} className="p-3 text-xs flex items-center justify-between">
            <div>
              <div className="font-medium">{new Date(r.created_at).toLocaleString()}</div>
              <div className="text-muted-foreground truncate max-w-[300px]">{r.referrer || "direct"}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground">{Math.round((r.duration_ms || 0) / 1000)}s</span>
              {r.cta_clicked && <Badge>CTA</Badge>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CtaBuilder({ ctas, onChange, accent }: { ctas: CTA[]; onChange: (v: CTA[]) => void; accent: string }) {
  const update = (i: number, patch: Partial<CTA>) => onChange(ctas.map((c, idx) => idx === i ? { ...c, ...patch } : c));
  const remove = (i: number) => onChange(ctas.filter((_, idx) => idx !== i));
  const add = () => onChange([...ctas, { label: "Click here", url: "https://", style: "primary" }]);
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= ctas.length) return;
    const next = [...ctas];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const previewStyle = (s: CTA["style"]): React.CSSProperties => {
    if (s === "primary") return { background: accent, color: "#fff", border: `1px solid ${accent}` };
    if (s === "secondary") return { background: "#1f2937", color: "#fff", border: "1px solid #1f2937" };
    return { background: "transparent", color: accent, border: `1px solid ${accent}` };
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm">Call-to-action buttons</Label>
          <p className="text-xs text-muted-foreground">Add one or more CTAs. They appear in order at the bottom of the page.</p>
        </div>
        <Button size="sm" onClick={add}><Plus className="h-3.5 w-3.5" /> Add CTA</Button>
      </div>

      {ctas.length === 0 && (
        <div className="border border-dashed rounded-md p-6 text-center text-sm text-muted-foreground">
          No CTAs yet. Add one to drive action.
        </div>
      )}

      {ctas.map((c, i) => (
        <div key={i} className="border rounded-md p-3 space-y-3 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">CTA #{i + 1}</span>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0}>↑</Button>
              <Button size="sm" variant="ghost" onClick={() => move(i, 1)} disabled={i === ctas.length - 1}>↓</Button>
              <Button size="sm" variant="ghost" onClick={() => remove(i)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Label</Label>
              <Input value={c.label} onChange={(e) => update(i, { label: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Style</Label>
              <Select value={c.style} onValueChange={(v) => update(i, { style: v as CTA["style"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primary (accent)</SelectItem>
                  <SelectItem value="secondary">Secondary (dark)</SelectItem>
                  <SelectItem value="outline">Outline</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">URL</Label>
            <Input value={c.url} onChange={(e) => update(i, { url: e.target.value })} placeholder="https://" />
          </div>
          <div className="pt-1">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Preview</span>
            <div className="mt-1">
              <button type="button" className="px-4 py-2 rounded-md text-sm font-medium" style={previewStyle(c.style)}>
                {c.label || "Button"}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
