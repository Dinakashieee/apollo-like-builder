import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Eye,
  Gem,
  Info,
  Plus,
  Building2,
  ArrowUp,
  ArrowDown,
  Pencil,
  Trash2,
  Loader2,
  ChevronDown,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Level = "high" | "medium" | "low";
type FitGrade = "A" | "B" | "C";
type DivisionKind = "division" | "product" | "service";

interface Account {
  id: string;
  workspace_id: string;
  company_name: string;
  domain: string | null;
  fit_grade: FitGrade;
  intent_level: Level;
  signal_strength: Level;
  buying_stage: number;
  notes: string | null;
}

interface Division {
  id: string;
  workspace_id: string;
  company_id: string;
  name: string;
  kind: DivisionKind;
  description: string | null;
  fit_grade: FitGrade;
  intent_level: Level;
  signal_strength: Level;
  buying_stage: number;
  notes: string | null;
}

const STAGE_LABELS = ["Research", "Awareness", "Consideration", "Evaluation", "Purchase", "Closed Won"];
const TOTAL_STAGES = 5;

const INTENT_RANK: Record<Level, number> = { high: 3, medium: 2, low: 1 };
const FIT_RANK: Record<FitGrade, number> = { A: 3, B: 2, C: 1 };

const KIND_LABELS: Record<DivisionKind, string> = {
  division: "Division",
  product: "Product",
  service: "Service",
};

const KIND_STYLES: Record<DivisionKind, string> = {
  division: "bg-indigo-50 text-indigo-700 border-indigo-200",
  product: "bg-emerald-50 text-emerald-700 border-emerald-200",
  service: "bg-amber-50 text-amber-700 border-amber-200",
};

const AVATAR_COLORS = [
  "bg-emerald-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-teal-500",
  "bg-indigo-500",
  "bg-orange-500",
];

function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 997;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** Best-fit division: highest fit, then intent, then signal, then buying stage. */
function bestDivision(divs: Division[]): Division | null {
  if (divs.length === 0) return null;
  return [...divs].sort((a, b) => {
    const fit = FIT_RANK[b.fit_grade] - FIT_RANK[a.fit_grade];
    if (fit !== 0) return fit;
    const intent = INTENT_RANK[b.intent_level] - INTENT_RANK[a.intent_level];
    if (intent !== 0) return intent;
    const signal = INTENT_RANK[b.signal_strength] - INTENT_RANK[a.signal_strength];
    if (signal !== 0) return signal;
    return b.buying_stage - a.buying_stage;
  })[0];
}

function IntentPill({ level }: { level: Level }) {
  const styles: Record<Level, string> = {
    high: "bg-emerald-50 text-emerald-700 border-emerald-200",
    medium: "bg-slate-100 text-slate-600 border-slate-200",
    low: "bg-slate-100 text-slate-500 border-slate-200",
  };
  const label = level === "high" ? "High" : level === "medium" ? "Medium" : "Low";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[13px] font-medium capitalize",
        styles[level]
      )}
    >
      {level === "high" && <Gem className="h-3.5 w-3.5" />}
      {label}
    </span>
  );
}

function SignalStrength({ level }: { level: Level }) {
  const dot: Record<Level, string> = {
    high: "bg-emerald-500",
    medium: "bg-amber-500",
    low: "bg-slate-300",
  };
  const label = level === "high" ? "High" : level === "medium" ? "Medium" : "Low";
  return (
    <span className="inline-flex items-center gap-2 text-[14px] text-foreground">
      <span className={cn("h-2.5 w-2.5 rounded-full", dot[level])} />
      {label}
    </span>
  );
}

function BuyingStage({ stage }: { stage: number }) {
  const label = STAGE_LABELS[Math.min(Math.max(stage, 0), STAGE_LABELS.length - 1)];
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: TOTAL_STAGES }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-3.5 w-3.5 rounded-full border transition-colors",
                  i < stage
                    ? "bg-emerald-500 border-emerald-500"
                    : i === stage
                    ? "bg-background border-emerald-500 ring-2 ring-emerald-500/25"
                    : "bg-muted border-border"
                )}
              />
            ))}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            Stage {stage} of {TOTAL_STAGES} — {label}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function KindBadge({ kind }: { kind: DivisionKind }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        KIND_STYLES[kind]
      )}
    >
      {KIND_LABELS[kind]}
    </span>
  );
}

function HeaderInfo({ text }: { text: string }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help" />
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs max-w-[220px]">{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

type SortKey = "fit" | "intent" | "signal" | "stage";

const emptyCompanyForm = {
  company_name: "",
  domain: "",
  fit_grade: "B" as FitGrade,
  intent_level: "medium" as Level,
  signal_strength: "medium" as Level,
  buying_stage: "0",
  notes: "",
};

const emptyDivisionForm = {
  name: "",
  kind: "division" as DivisionKind,
  description: "",
  fit_grade: "B" as FitGrade,
  intent_level: "medium" as Level,
  signal_strength: "medium" as Level,
  buying_stage: "0",
  notes: "",
};

export default function Companies() {
  const { current } = useWorkspace();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [visibleCols, setVisibleCols] = useState({
    fit: true,
    intent: true,
    signal: true,
    stage: true,
  });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Company dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyCompanyForm);

  // Division dialog
  const [divDialogOpen, setDivDialogOpen] = useState(false);
  const [divEditing, setDivEditing] = useState<Division | null>(null);
  const [divCompany, setDivCompany] = useState<Account | null>(null);
  const [divSaving, setDivSaving] = useState(false);
  const [divForm, setDivForm] = useState(emptyDivisionForm);

  const load = async () => {
    if (!current?.id) return;
    setLoading(true);
    const [accRes, divRes] = await Promise.all([
      supabase
        .from("account_intelligence")
        .select("*")
        .eq("workspace_id", current.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("company_divisions")
        .select("*")
        .eq("workspace_id", current.id)
        .order("created_at", { ascending: true }),
    ]);
    setLoading(false);
    if (accRes.error) {
      toast({ title: "Couldn't load companies", description: accRes.error.message, variant: "destructive" });
      return;
    }
    if (divRes.error) {
      toast({ title: "Couldn't load divisions", description: divRes.error.message, variant: "destructive" });
      return;
    }
    setAccounts((accRes.data ?? []) as Account[]);
    setDivisions((divRes.data ?? []) as Division[]);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  const divisionsByCompany = useMemo(() => {
    const map = new Map<string, Division[]>();
    for (const d of divisions) {
      const list = map.get(d.company_id) ?? [];
      list.push(d);
      map.set(d.company_id, list);
    }
    return map;
  }, [divisions]);

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openAdd = () => {
    setEditing(null);
    setForm(emptyCompanyForm);
    setDialogOpen(true);
  };

  const openEdit = (a: Account) => {
    setEditing(a);
    setForm({
      company_name: a.company_name,
      domain: a.domain ?? "",
      fit_grade: a.fit_grade,
      intent_level: a.intent_level,
      signal_strength: a.signal_strength,
      buying_stage: String(a.buying_stage),
      notes: a.notes ?? "",
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!current?.id) return;
    if (!form.company_name.trim()) {
      toast({ title: "Company name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      workspace_id: current.id,
      company_name: form.company_name.trim(),
      domain: form.domain.trim() || null,
      fit_grade: form.fit_grade,
      intent_level: form.intent_level,
      signal_strength: form.signal_strength,
      buying_stage: Number(form.buying_stage),
      notes: form.notes.trim() || null,
    };
    const { error } = editing
      ? await supabase.from("account_intelligence").update(payload).eq("id", editing.id)
      : await supabase.from("account_intelligence").insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save company", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editing ? "Company updated" : "Company added" });
    setDialogOpen(false);
    load();
  };

  const remove = async (a: Account) => {
    const { error } = await supabase.from("account_intelligence").delete().eq("id", a.id);
    if (error) {
      toast({ title: "Couldn't remove company", description: error.message, variant: "destructive" });
      return;
    }
    setAccounts((prev) => prev.filter((x) => x.id !== a.id));
    setDivisions((prev) => prev.filter((d) => d.company_id !== a.id));
    toast({ title: "Company removed" });
  };

  const openAddDivision = (company: Account) => {
    setDivEditing(null);
    setDivCompany(company);
    setDivForm(emptyDivisionForm);
    setDivDialogOpen(true);
  };

  const openEditDivision = (company: Account, d: Division) => {
    setDivEditing(d);
    setDivCompany(company);
    setDivForm({
      name: d.name,
      kind: d.kind,
      description: d.description ?? "",
      fit_grade: d.fit_grade,
      intent_level: d.intent_level,
      signal_strength: d.signal_strength,
      buying_stage: String(d.buying_stage),
      notes: d.notes ?? "",
    });
    setDivDialogOpen(true);
  };

  const saveDivision = async () => {
    if (!current?.id || !divCompany) return;
    if (!divForm.name.trim()) {
      toast({ title: "Division name is required", variant: "destructive" });
      return;
    }
    setDivSaving(true);
    const payload = {
      workspace_id: current.id,
      company_id: divCompany.id,
      name: divForm.name.trim(),
      kind: divForm.kind,
      description: divForm.description.trim() || null,
      fit_grade: divForm.fit_grade,
      intent_level: divForm.intent_level,
      signal_strength: divForm.signal_strength,
      buying_stage: Number(divForm.buying_stage),
      notes: divForm.notes.trim() || null,
    };
    const { error } = divEditing
      ? await supabase.from("company_divisions").update(payload).eq("id", divEditing.id)
      : await supabase.from("company_divisions").insert(payload);
    setDivSaving(false);
    if (error) {
      toast({ title: "Couldn't save division", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: divEditing ? "Division updated" : "Division added" });
    setDivDialogOpen(false);
    setExpanded((prev) => new Set(prev).add(divCompany.id));
    load();
  };

  const removeDivision = async (d: Division) => {
    const { error } = await supabase.from("company_divisions").delete().eq("id", d.id);
    if (error) {
      toast({ title: "Couldn't remove division", description: error.message, variant: "destructive" });
      return;
    }
    setDivisions((prev) => prev.filter((x) => x.id !== d.id));
    toast({ title: "Division removed" });
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = accounts.filter(
      (a) =>
        !q ||
        a.company_name.toLowerCase().includes(q) ||
        (a.domain ?? "").toLowerCase().includes(q) ||
        (divisionsByCompany.get(a.id) ?? []).some((d) => d.name.toLowerCase().includes(q))
    );
    if (sortKey) {
      const eff = (a: Account) => bestDivision(divisionsByCompany.get(a.id) ?? []) ?? a;
      const rank = (a: Account) => {
        const e = eff(a);
        return sortKey === "fit"
          ? FIT_RANK[e.fit_grade]
          : sortKey === "intent"
          ? INTENT_RANK[e.intent_level]
          : sortKey === "signal"
          ? INTENT_RANK[e.signal_strength]
          : e.buying_stage;
      };
      rows = [...rows].sort((a, b) =>
        sortDir === "desc" ? rank(b) - rank(a) : rank(a) - rank(b)
      );
    }
    return rows;
  }, [accounts, divisionsByCompany, search, sortKey, sortDir]);

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey === col ? (
      sortDir === "desc" ? (
        <ArrowDown className="h-3.5 w-3.5 text-foreground" />
      ) : (
        <ArrowUp className="h-3.5 w-3.5 text-foreground" />
      )
    ) : (
      <ArrowUp className="h-3.5 w-3.5 text-muted-foreground/40 opacity-0 group-hover/th:opacity-100" />
    );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-display font-bold text-primary-deep">Companies</h1>
          <p className="text-muted-foreground mt-1">
            {loading
              ? "Loading…"
              : `${accounts.length.toLocaleString()} ${accounts.length === 1 ? "Company" : "Companies"}${
                  divisions.length > 0
                    ? ` · ${divisions.length} ${divisions.length === 1 ? "Division" : "Divisions"}`
                    : ""
                }`}
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" /> Add company
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="pl-9 h-11 bg-muted/40 border-border/60"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 h-11">
              <Eye className="h-4 w-4" /> Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={visibleCols.fit}
              onCheckedChange={(v) => setVisibleCols((c) => ({ ...c, fit: !!v }))}
            >
              Fit
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={visibleCols.intent}
              onCheckedChange={(v) => setVisibleCols((c) => ({ ...c, intent: !!v }))}
            >
              Intent Level
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={visibleCols.signal}
              onCheckedChange={(v) => setVisibleCols((c) => ({ ...c, signal: !!v }))}
            >
              Signal Strength
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={visibleCols.stage}
              onCheckedChange={(v) => setVisibleCols((c) => ({ ...c, stage: !!v }))}
            >
              Buying stage
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-medium text-foreground">
              {accounts.length === 0 ? "No companies yet" : "No companies match your search"}
            </p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              {accounts.length === 0
                ? "Add your first account to start tracking fit, intent, and buying stage."
                : "Try a different search term."}
            </p>
            {accounts.length === 0 && (
              <div className="flex items-center justify-center gap-2">
                <Button onClick={openAdd} className="gap-2">
                  <Plus className="h-4 w-4" /> Add company
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th className="px-5 py-3 text-[13px] font-medium text-muted-foreground">
                    Company
                  </th>
                  {visibleCols.fit && (
                    <th className="px-5 py-3 text-[13px] font-medium text-muted-foreground">
                      <button
                        className="group/th inline-flex items-center gap-1.5"
                        onClick={() => toggleSort("fit")}
                      >
                        Fit <SortIcon col="fit" />
                        <HeaderInfo text="How well this company matches your ideal customer profile (A = best fit). For companies with divisions, this rolls up from the best-fit division." />
                      </button>
                    </th>
                  )}
                  {visibleCols.intent && (
                    <th className="px-5 py-3 text-[13px] font-medium text-muted-foreground">
                      <button
                        className="group/th inline-flex items-center gap-1.5"
                        onClick={() => toggleSort("intent")}
                      >
                        Intent Level <SortIcon col="intent" />
                        <HeaderInfo text="How actively this company is showing buying intent right now." />
                      </button>
                    </th>
                  )}
                  {visibleCols.signal && (
                    <th className="px-5 py-3 text-[13px] font-medium text-muted-foreground">
                      <button
                        className="group/th inline-flex items-center gap-1.5"
                        onClick={() => toggleSort("signal")}
                      >
                        Signal Strength <SortIcon col="signal" />
                        <HeaderInfo text="The strength of recent signals (hiring, tech changes, engagement, news)." />
                      </button>
                    </th>
                  )}
                  {visibleCols.stage && (
                    <th className="px-5 py-3 text-[13px] font-medium text-muted-foreground">
                      <button
                        className="group/th inline-flex items-center gap-1.5"
                        onClick={() => toggleSort("stage")}
                      >
                        Buying stage <SortIcon col="stage" />
                        <HeaderInfo text="Where this account is in the buying journey, from Research to Purchase." />
                      </button>
                    </th>
                  )}
                  <th className="px-5 py-3 w-20" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => {
                  const divs = divisionsByCompany.get(a.id) ?? [];
                  const best = bestDivision(divs);
                  const eff = best ?? a;
                  const hasDivs = divs.length > 0;
                  const isExpanded = expanded.has(a.id);
                  return (
                    <>
                      <tr
                        key={a.id}
                        className="border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors"
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            {hasDivs ? (
                              <button
                                onClick={() => toggleExpanded(a.id)}
                                aria-label={isExpanded ? `Collapse ${a.company_name}` : `Expand ${a.company_name}`}
                                className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors shrink-0"
                              >
                                <ChevronDown
                                  className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")}
                                />
                              </button>
                            ) : (
                              <span className="w-8 shrink-0" />
                            )}
                            <span
                              className={cn(
                                "h-8 w-8 rounded-full text-white text-[11px] font-semibold flex items-center justify-center shrink-0",
                                avatarColor(a.company_name)
                              )}
                            >
                              {initials(a.company_name)}
                            </span>
                            <div className="min-w-0">
                              <p className="text-[14px] font-medium text-foreground truncate">
                                {a.company_name}
                              </p>
                              <div className="flex items-center gap-2">
                                {a.domain && (
                                  <p className="text-[11px] text-muted-foreground truncate">{a.domain}</p>
                                )}
                                {hasDivs && (
                                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                    <Layers className="h-3 w-3" />
                                    {divs.length} {divs.length === 1 ? "division" : "divisions"}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        {visibleCols.fit && (
                          <td className="px-5 py-3">
                            <div className="text-[14px] font-semibold text-foreground">{eff.fit_grade}</div>
                            {hasDivs && best && (
                              <div className="text-[11px] text-muted-foreground truncate max-w-[130px]">
                                best: {best.name}
                              </div>
                            )}
                          </td>
                        )}
                        {visibleCols.intent && (
                          <td className="px-5 py-3">
                            <IntentPill level={eff.intent_level} />
                          </td>
                        )}
                        {visibleCols.signal && (
                          <td className="px-5 py-3">
                            <SignalStrength level={eff.signal_strength} />
                          </td>
                        )}
                        {visibleCols.stage && (
                          <td className="px-5 py-3">
                            <BuyingStage stage={eff.buying_stage} />
                          </td>
                        )}
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground"
                              onClick={() => openEdit(a)}
                              aria-label={`Edit ${a.company_name}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => remove(a)}
                              aria-label={`Remove ${a.company_name}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {hasDivs && isExpanded && (
                        <tr key={`${a.id}-divs`} className="border-b border-border/40 bg-muted/10">
                          <td colSpan={2 + Number(visibleCols.intent) + Number(visibleCols.signal) + Number(visibleCols.stage)} className="px-5 py-3">
                            <div className="pl-11">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide">
                                  Divisions, products & services
                                </p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1.5 h-7 text-[12px]"
                                  onClick={() => openAddDivision(a)}
                                >
                                  <Plus className="h-3 w-3" /> Add division
                                </Button>
                              </div>
                              <div className="rounded-lg border border-border/60 bg-card overflow-hidden">
                                <table className="w-full text-left">
                                  <tbody>
                                    {divs.map((d) => (
                                      <tr
                                        key={d.id}
                                        className="border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors"
                                      >
                                        <td className="px-4 py-2.5">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-[13px] font-medium text-foreground">
                                              {d.name}
                                            </span>
                                            <KindBadge kind={d.kind} />
                                          </div>
                                          {d.description && (
                                            <p className="text-[11px] text-muted-foreground mt-0.5 max-w-md">
                                              {d.description}
                                            </p>
                                          )}
                                        </td>
                                        <td className="px-4 py-2.5 text-[13px] font-semibold text-foreground w-12">
                                          {d.fit_grade}
                                        </td>
                                        <td className="px-4 py-2.5">
                                          <IntentPill level={d.intent_level} />
                                        </td>
                                        <td className="px-4 py-2.5">
                                          <SignalStrength level={d.signal_strength} />
                                        </td>
                                        <td className="px-4 py-2.5">
                                          <BuyingStage stage={d.buying_stage} />
                                        </td>
                                        <td className="px-4 py-2.5">
                                          <div className="flex items-center justify-end gap-1">
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-7 w-7 text-muted-foreground"
                                              onClick={() => openEditDivision(a, d)}
                                              aria-label={`Edit ${d.name}`}
                                            >
                                              <Pencil className="h-3 w-3" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                              onClick={() => removeDivision(d)}
                                              aria-label={`Remove ${d.name}`}
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / edit company dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit company" : "Add company"}</DialogTitle>
            <DialogDescription>
              Track fit, intent, signal strength, and buying stage for this account. If you add
              divisions, the headline score rolls up from the best-fit division.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Company name</label>
              <Input
                value={form.company_name}
                onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
                placeholder="Acme Corp"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Website</label>
              <Input
                value={form.domain}
                onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))}
                placeholder="acme.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Fit</label>
                <Select
                  value={form.fit_grade}
                  onValueChange={(v) => setForm((f) => ({ ...f, fit_grade: v as FitGrade }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">A — Best fit</SelectItem>
                    <SelectItem value="B">B — Good fit</SelectItem>
                    <SelectItem value="C">C — Weak fit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Buying stage</label>
                <Select
                  value={form.buying_stage}
                  onValueChange={(v) => setForm((f) => ({ ...f, buying_stage: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGE_LABELS.slice(0, TOTAL_STAGES).map((s, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {i} — {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Intent level</label>
                <Select
                  value={form.intent_level}
                  onValueChange={(v) => setForm((f) => ({ ...f, intent_level: v as Level }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Signal strength</label>
                <Select
                  value={form.signal_strength}
                  onValueChange={(v) => setForm((f) => ({ ...f, signal_strength: v as Level }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Context, pain points, next steps…"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Save changes" : "Add company"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / edit division dialog */}
      <Dialog open={divDialogOpen} onOpenChange={setDivDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{divEditing ? "Edit division" : "Add division"}</DialogTitle>
            <DialogDescription>
              {divCompany ? `Scored on its own within ${divCompany.company_name}.` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={divForm.name}
                  onChange={(e) => setDivForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Digital Industries"
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <label className="text-sm font-medium">Type</label>
                <Select
                  value={divForm.kind}
                  onValueChange={(v) => setDivForm((f) => ({ ...f, kind: v as DivisionKind }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="division">Division / Business unit</SelectItem>
                    <SelectItem value="product">Product</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <label className="text-sm font-medium">What they sell / do</label>
                <Textarea
                  value={divForm.description}
                  onChange={(e) => setDivForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Products, services, or focus of this division…"
                  rows={2}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Fit</label>
                <Select
                  value={divForm.fit_grade}
                  onValueChange={(v) => setDivForm((f) => ({ ...f, fit_grade: v as FitGrade }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">A — Best fit</SelectItem>
                    <SelectItem value="B">B — Good fit</SelectItem>
                    <SelectItem value="C">C — Weak fit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Buying stage</label>
                <Select
                  value={divForm.buying_stage}
                  onValueChange={(v) => setDivForm((f) => ({ ...f, buying_stage: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGE_LABELS.slice(0, TOTAL_STAGES).map((s, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {i} — {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Intent level</label>
                <Select
                  value={divForm.intent_level}
                  onValueChange={(v) => setDivForm((f) => ({ ...f, intent_level: v as Level }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Signal strength</label>
                <Select
                  value={divForm.signal_strength}
                  onValueChange={(v) => setDivForm((f) => ({ ...f, signal_strength: v as Level }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={divForm.notes}
                onChange={(e) => setDivForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Stakeholders, pain points, next steps…"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDivDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveDivision} disabled={divSaving} className="gap-2">
              {divSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {divEditing ? "Save changes" : "Add division"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
