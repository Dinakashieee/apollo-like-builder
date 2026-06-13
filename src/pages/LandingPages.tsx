import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { Copy, ExternalLink, Plus, Trash2, Eye, MousePointerClick, Clock, Users, GripVertical, Send, Heading1, Type, Image as ImageIcon, Video, MousePointer, Code, Minus, MoveVertical } from "lucide-react";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Block, BLOCK_LABELS, newBlock, renderBlock, interpolate, ctaStyle } from "@/lib/landingBlocks";

type Lead = { id: string; contact_name: string | null; company_name: string | null; email: string | null };
type Sequence = { id: string; name: string };
export type CTA = { label: string; url: string; style: "primary" | "secondary" | "outline" };
type Page = {
  id: string;
  slug: string;
  title: string;
  workspace_id: string;
  template: string;
  prospect_name: string | null;
  prospect_company: string | null;
  headline: string | null;
  subheadline: string | null;
  body: string | null;
  cta_label: string | null;
  cta_url: string | null;
  ctas: CTA[];
  blocks: Block[];
  logo_url: string | null;
  accent_color: string | null;
  lead_id: string | null;
  published: boolean;
  created_at: string;
};

const TEMPLATES = [
  { id: "minimal", name: "Minimal", desc: "Light, focused" },
  { id: "bold", name: "Bold Gradient", desc: "Dark, dramatic" },
  { id: "split", name: "Split (legacy)", desc: "Two-column" },
];

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40);
}

const BLOCK_ICONS: Record<Block["type"], any> = {
  heading: Heading1, text: Type, image: ImageIcon, video: Video, cta: MousePointer, html: Code, divider: Minus, spacer: MoveVertical,
};

export default function LandingPages() {
  const { current } = useWorkspace();
  const { user } = useAuth();
  const [pages, setPages] = useState<Page[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Page | null>(null);
  const [enrollPage, setEnrollPage] = useState<Page | null>(null);

  const load = async () => {
    if (!current) return;
    setLoading(true);
    const [{ data: ps }, { data: ls }, { data: sq }] = await Promise.all([
      supabase.from("landing_pages").select("*").eq("workspace_id", current.id).order("created_at", { ascending: false }),
      supabase.from("leads").select("id,contact_name,company_name,email").eq("workspace_id", current.id).order("created_at", { ascending: false }).limit(1000),
      supabase.from("sequences").select("id,name").eq("workspace_id", current.id).order("created_at", { ascending: false }),
    ]);
    setPages(((ps as any[]) || []).map((p) => ({
      ...p,
      ctas: Array.isArray(p.ctas) ? p.ctas : [],
      blocks: Array.isArray(p.blocks) ? p.blocks : [],
    })));
    setLeads((ls as Lead[]) || []);
    setSequences((sq as Sequence[]) || []);
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
          <p className="text-muted-foreground mt-1">Build custom pages for prospects, send sequences, and track engagement.</p>
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
            <PageCard
              key={p.id}
              page={p}
              onOpen={() => setEditing(p)}
              onCopy={() => copyLink(p.slug)}
              onDelete={() => remove(p.id)}
              onSend={() => setEnrollPage(p)}
              baseUrl={baseUrl}
            />
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
        <SheetContent className="w-full sm:max-w-[min(100vw,1200px)] overflow-hidden p-0">
          {editing && (
            <EditorPanel page={editing} leads={leads} onSaved={() => load()} onClose={() => setEditing(null)} />
          )}
        </SheetContent>
      </Sheet>

      <EnrollDialog
        page={enrollPage}
        leads={leads}
        sequences={sequences}
        workspaceId={current?.id}
        onClose={() => setEnrollPage(null)}
      />
    </div>
  );
}

function PageCard({ page, onOpen, onCopy, onDelete, onSend, baseUrl }: { page: Page; onOpen: () => void; onCopy: () => void; onDelete: () => void; onSend: () => void; baseUrl: string }) {
  const [stats, setStats] = useState({ views: 0, unique: 0, clicks: 0 });
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("landing_page_views")
        .select("visitor_id,cta_clicked")
        .eq("page_id", page.id);
      const rows = data || [];
      const unique = new Set(rows.map((r: any) => r.visitor_id).filter(Boolean)).size;
      setStats({ views: rows.length, unique, clicks: rows.filter((r: any) => r.cta_clicked).length });
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
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" className="flex-1" onClick={onOpen}>Edit</Button>
          <Button size="sm" variant="outline" onClick={onSend} title="Send sequence to leads"><Send className="h-3.5 w-3.5" /></Button>
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
    const starterBlocks: Block[] = [
      { id: crypto.randomUUID(), type: "heading", text: "Hi {name}, this is for {company}", level: 1, align: "left" },
      { id: crypto.randomUUID(), type: "text", text: "A quick look at how we can help you grow.", align: "left" },
      { id: crypto.randomUUID(), type: "cta", label: "Book a call", url: "https://", style: "primary", align: "left" },
    ];
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
        headline: null, subheadline: null, body: null,
        cta_label: null, cta_url: null,
        ctas: [] as any,
        blocks: starterBlocks as any,
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
        blocks: p.blocks as any,
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
    <div className="flex h-full flex-col">
      <SheetHeader className="px-6 pt-6 pb-3 border-b">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <SheetTitle className="truncate">{p.title}</SheetTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
              <a href={url} target="_blank" rel="noreferrer" className="underline truncate">{url}</a>
              <Button size="sm" variant="ghost" className="h-6 px-1" onClick={() => { navigator.clipboard.writeText(url); toast({ title: "Link copied" }); }}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
            <Button size="sm" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </div>
        </div>
      </SheetHeader>

      <div className="grid lg:grid-cols-2 flex-1 overflow-hidden">
        {/* LEFT: Editor */}
        <ScrollArea className="border-r">
          <div className="p-6">
            <Tabs defaultValue="blocks">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="blocks">Blocks</TabsTrigger>
                <TabsTrigger value="content">Details</TabsTrigger>
                <TabsTrigger value="design">Design</TabsTrigger>
                <TabsTrigger value="stats">Stats</TabsTrigger>
              </TabsList>

              <TabsContent value="blocks" className="mt-4">
                <BlockBuilder blocks={p.blocks} onChange={(v) => set("blocks", v)} accent={p.accent_color || "#6366f1"} workspaceId={p.workspace_id} />
              </TabsContent>

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
                <p className="text-xs text-muted-foreground">Tip: use <code className="bg-muted px-1 rounded">{"{name}"}</code> and <code className="bg-muted px-1 rounded">{"{company}"}</code> in any block.</p>
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
          </div>
        </ScrollArea>

        {/* RIGHT: Live preview */}
        <div className="hidden lg:flex flex-col bg-muted/30">
          <div className="px-4 py-2 text-xs uppercase tracking-wide text-muted-foreground border-b bg-background">Live preview</div>
          <ScrollArea className="flex-1">
            <LivePreview page={p} />
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

function LivePreview({ page }: { page: Page }) {
  const accent = page.accent_color || "#6366f1";
  const vars = { name: page.prospect_name, company: page.prospect_company };
  const onDark = page.template === "bold";

  const wrapperStyle: React.CSSProperties = onDark
    ? { background: `linear-gradient(135deg, ${accent} 0%, #0f172a 100%)`, color: "#fff" }
    : { background: "hsl(var(--background))" };

  const hasBlocks = page.blocks?.length > 0;

  return (
    <div className="min-h-full" style={wrapperStyle}>
      <div className={`max-w-2xl mx-auto px-6 py-10 ${onDark ? "text-white" : ""}`}>
        {page.logo_url && <img src={page.logo_url} alt="" className={`h-8 mb-6 ${onDark ? "brightness-0 invert" : ""}`} />}
        {hasBlocks ? (
          <div className="space-y-6">
            {page.blocks.map((b) => (
              <div key={b.id}>{renderBlock(b, { accent, onDark, vars })}</div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground italic">No blocks yet. Add blocks on the left to see them here.</div>
        )}
      </div>
    </div>
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

/* ============== Block builder ============== */

function BlockBuilder({ blocks, onChange, accent, workspaceId }: { blocks: Block[]; onChange: (v: Block[]) => void; accent: string; workspaceId?: string }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const updateBlock = (id: string, patch: Partial<Block>) =>
    onChange(blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as Block) : b)));
  const removeBlock = (id: string) => onChange(blocks.filter((b) => b.id !== id));
  const addBlock = (type: Block["type"]) => onChange([...blocks, newBlock(type)]);
  const duplicateBlock = (id: string) => {
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx < 0) return;
    const copy = { ...blocks[idx], id: crypto.randomUUID() } as Block;
    const next = [...blocks];
    next.splice(idx + 1, 0, copy);
    onChange(next);
  };

  const onDragEnd = (e: any) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = blocks.findIndex((b) => b.id === active.id);
    const to = blocks.findIndex((b) => b.id === over.id);
    if (from < 0 || to < 0) return;
    onChange(arrayMove(blocks, from, to));
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-sm">Page sections</Label>
        <p className="text-xs text-muted-foreground">Drag the handle to reorder. Personalization tokens {"{name}"} and {"{company}"} work in text fields.</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(BLOCK_LABELS) as Block["type"][]).map((t) => {
          const Icon = BLOCK_ICONS[t];
          return (
            <Button key={t} size="sm" variant="outline" onClick={() => addBlock(t)} className="h-8">
              <Icon className="h-3.5 w-3.5" /> {BLOCK_LABELS[t]}
            </Button>
          );
        })}
      </div>

      {blocks.length === 0 ? (
        <div className="border border-dashed rounded-md p-8 text-center text-sm text-muted-foreground">
          No blocks yet. Add one above to build your page.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {blocks.map((b) => (
                <SortableBlock
                  key={b.id}
                  block={b}
                  accent={accent}
                  workspaceId={workspaceId}
                  onUpdate={(patch) => updateBlock(b.id, patch)}
                  onRemove={() => removeBlock(b.id)}
                  onDuplicate={() => duplicateBlock(b.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function SortableBlock({ block, accent, workspaceId, onUpdate, onRemove, onDuplicate }: {
  block: Block; accent: string; workspaceId?: string; onUpdate: (p: Partial<Block>) => void; onRemove: () => void; onDuplicate: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const Icon = BLOCK_ICONS[block.type];

  return (
    <div ref={setNodeRef} style={style} className="border rounded-md bg-card">
      <div className="flex items-center gap-2 px-2 py-1.5 border-b bg-muted/30">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground p-1" aria-label="Drag">
          <GripVertical className="h-4 w-4" />
        </button>
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium uppercase tracking-wide">{BLOCK_LABELS[block.type]}</span>
        <div className="ml-auto flex items-center gap-1">
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onDuplicate}>Duplicate</Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onRemove}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
      <div className="p-3 space-y-2">
        <BlockEditor block={block} accent={accent} workspaceId={workspaceId} onUpdate={onUpdate} />
      </div>
    </div>
  );
}

function ImageUploadButton({ workspaceId, onUploaded }: { workspaceId?: string; onUploaded: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = async (file: File) => {
    if (!workspaceId) { toast({ title: "No workspace", variant: "destructive" }); return; }
    if (file.size > 5 * 1024 * 1024) { toast({ title: "Image too large", description: "Max 5MB", variant: "destructive" }); return; }
    setUploading(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `${workspaceId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("landing-assets").upload(path, file, { contentType: file.type, upsert: false });
    if (error) { toast({ title: "Upload failed", description: error.message, variant: "destructive" }); setUploading(false); return; }
    const { data } = await supabase.storage.from("landing-assets").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
    if (data?.signedUrl) onUploaded(data.signedUrl);
    setUploading(false);
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handle(f); e.target.value = ""; }}
      />
      <Button type="button" size="sm" variant="outline" className="h-9 text-xs" disabled={uploading} onClick={() => inputRef.current?.click()}>
        <Upload className="h-3.5 w-3.5 mr-1.5" />
        {uploading ? "Uploading…" : "Upload"}
      </Button>
    </>
  );
}

function BlockEditor({ block, accent, workspaceId, onUpdate }: { block: Block; accent: string; workspaceId?: string; onUpdate: (p: Partial<Block>) => void }) {
  switch (block.type) {
    case "heading":
      return (
        <>
          <Input value={block.text} onChange={(e) => onUpdate({ text: e.target.value } as any)} />
          <div className="grid grid-cols-2 gap-2">
            <Select value={String(block.level ?? 2)} onValueChange={(v) => onUpdate({ level: Number(v) as 1 | 2 | 3 } as any)}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">H1 — Largest</SelectItem>
                <SelectItem value="2">H2</SelectItem>
                <SelectItem value="3">H3</SelectItem>
              </SelectContent>
            </Select>
            <Select value={block.align ?? "left"} onValueChange={(v) => onUpdate({ align: v as any } as any)}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="center">Center</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      );
    case "text":
      return (
        <>
          <Textarea rows={4} value={block.text} onChange={(e) => onUpdate({ text: e.target.value } as any)} />
          <Select value={block.align ?? "left"} onValueChange={(v) => onUpdate({ align: v as any } as any)}>
            <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
            </SelectContent>
          </Select>
        </>
      );
    case "image":
      return (
        <>
          <Input placeholder="Image URL (https://…)" value={block.url} onChange={(e) => onUpdate({ url: e.target.value } as any)} />
          <Input placeholder="Alt text" value={block.alt || ""} onChange={(e) => onUpdate({ alt: e.target.value } as any)} />
          <label className="flex items-center gap-2 text-xs">
            <Checkbox checked={block.rounded !== false} onCheckedChange={(v) => onUpdate({ rounded: !!v } as any)} />
            Rounded corners
          </label>
        </>
      );
    case "video":
      return <Input placeholder="YouTube / Vimeo URL" value={block.url} onChange={(e) => onUpdate({ url: e.target.value } as any)} />;
    case "cta":
      return (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Label" value={block.label} onChange={(e) => onUpdate({ label: e.target.value } as any)} />
            <Select value={block.style} onValueChange={(v) => onUpdate({ style: v as any } as any)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="primary">Primary</SelectItem>
                <SelectItem value="secondary">Secondary</SelectItem>
                <SelectItem value="outline">Outline</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Input placeholder="https://" value={block.url} onChange={(e) => onUpdate({ url: e.target.value } as any)} />
          <Select value={block.align ?? "left"} onValueChange={(v) => onUpdate({ align: v as any } as any)}>
            <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
            </SelectContent>
          </Select>
          <div className="pt-1">
            <button type="button" className="px-4 py-2 rounded-md text-sm font-medium" style={ctaStyle(block.style, accent)}>
              {interpolate(block.label, { name: "Sample", company: "Acme" }) || "Button"}
            </button>
          </div>
        </>
      );
    case "html":
      return (
        <>
          <Textarea rows={6} className="font-mono text-xs" value={block.html} onChange={(e) => onUpdate({ html: e.target.value } as any)} />
          <p className="text-[11px] text-muted-foreground">HTML is sanitized. Allowed: headings, paragraphs, lists, links, images, basic formatting.</p>
        </>
      );
    case "spacer":
      return (
        <Select value={block.size ?? "md"} onValueChange={(v) => onUpdate({ size: v as any } as any)}>
          <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="sm">Small</SelectItem>
            <SelectItem value="md">Medium</SelectItem>
            <SelectItem value="lg">Large</SelectItem>
          </SelectContent>
        </Select>
      );
    case "divider":
      return <p className="text-xs text-muted-foreground">A horizontal rule will be inserted here.</p>;
  }
}

/* ============== Enroll dialog ============== */

function EnrollDialog({ page, leads, sequences, workspaceId, onClose }: {
  page: Page | null; leads: Lead[]; sequences: Sequence[]; workspaceId?: string; onClose: () => void;
}) {
  const [seqId, setSeqId] = useState<string>("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (page) {
      setSeqId(sequences[0]?.id || "");
      setSelected(page.lead_id ? new Set([page.lead_id]) : new Set());
      setSearch("");
    }
  }, [page?.id, sequences.length]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((l) =>
      (l.contact_name || "").toLowerCase().includes(q) ||
      (l.company_name || "").toLowerCase().includes(q) ||
      (l.email || "").toLowerCase().includes(q)
    );
  }, [leads, search]);

  const toggle = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };
  const toggleAll = () => {
    setSelected((s) => s.size === filtered.length ? new Set() : new Set(filtered.map((l) => l.id)));
  };

  const enroll = async () => {
    if (!workspaceId || !seqId || selected.size === 0) return;
    setWorking(true);
    const { data: steps } = await supabase
      .from("sequence_steps")
      .select("id,day_offset,step_order")
      .eq("sequence_id", seqId)
      .order("step_order");
    if (!steps || steps.length === 0) {
      toast({ title: "Sequence has no steps", description: "Add steps to the sequence first.", variant: "destructive" });
      setWorking(false);
      return;
    }
    const leadIds = Array.from(selected);
    const enrollRows = leadIds.map((lead_id) => ({ workspace_id: workspaceId, sequence_id: seqId, lead_id }));
    const { data: enrolls, error } = await supabase
      .from("sequence_enrollments")
      .insert(enrollRows)
      .select("id,lead_id");
    if (error || !enrolls) {
      toast({ title: "Failed to enroll", description: error?.message, variant: "destructive" });
      setWorking(false);
      return;
    }
    const now = Date.now();
    const statusRows = enrolls.flatMap((e: any) =>
      steps.map((s: any) => ({
        enrollment_id: e.id,
        step_id: s.id,
        workspace_id: workspaceId,
        due_at: new Date(now + s.day_offset * 86400000).toISOString(),
      }))
    );
    if (statusRows.length) await supabase.from("sequence_step_status").insert(statusRows);
    toast({ title: `Enrolled ${enrolls.length} lead${enrolls.length === 1 ? "" : "s"}` });
    setWorking(false);
    onClose();
  };

  return (
    <Dialog open={!!page} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader><DialogTitle>Send sequence to leads</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Field label="Sequence">
            {sequences.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sequences yet. Create one in Automation.</p>
            ) : (
              <Select value={seqId} onValueChange={setSeqId}>
                <SelectTrigger><SelectValue placeholder="Pick a sequence" /></SelectTrigger>
                <SelectContent>
                  {sequences.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </Field>

          <Field label={`Leads (${selected.size} selected)`}>
            <Input placeholder="Search by name, company, or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </Field>

          <div className="flex items-center justify-between text-xs">
            <button className="text-primary hover:underline" onClick={toggleAll}>
              {selected.size === filtered.length && filtered.length > 0 ? "Clear selection" : "Select all visible"}
            </button>
            <span className="text-muted-foreground">{filtered.length} lead{filtered.length === 1 ? "" : "s"}</span>
          </div>

          <ScrollArea className="h-72 border rounded-md">
            <div className="divide-y">
              {filtered.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">No matching leads.</div>
              ) : filtered.map((l) => (
                <label key={l.id} className="flex items-center gap-3 p-2.5 hover:bg-muted/40 cursor-pointer">
                  <Checkbox checked={selected.has(l.id)} onCheckedChange={() => toggle(l.id)} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{l.contact_name || "Unnamed"}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {l.company_name || "—"}{l.email ? ` · ${l.email}` : ""}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </ScrollArea>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={enroll} disabled={working || !seqId || selected.size === 0}>
            {working ? "Enrolling…" : `Enroll ${selected.size} lead${selected.size === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
