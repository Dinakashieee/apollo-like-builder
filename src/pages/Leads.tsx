import { useEffect, useMemo, useState } from "react";
import { Search, Download, Flame, Sun, Snowflake, Minus, MessageSquare, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Skeleton } from "@/components/ui/skeleton";
import { AddLeadDialog } from "@/components/AddLeadDialog";
import { ImportDialog } from "@/components/ImportDialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { LeadEmailComposerPanel } from "@/components/LeadEmailComposerPanel";
import { WhatsAppPanel } from "@/components/WhatsAppPanel";
import { LeadIntelligencePanel } from "@/components/LeadIntelligencePanel";
import { LeadProfilePanel } from "@/components/LeadProfilePanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { logActivity } from "@/lib/activities";
import { useAuth } from "@/hooks/useAuth";
import { extractOwnedProducts, matchOwnedProducts } from "@/lib/productMatch";

const TEMP_BADGE: Record<string, { cls: string; icon: typeof Flame; label: string }> = {
  hot: { cls: "bg-hot/15 text-hot", icon: Flame, label: "Hot" },
  warm: { cls: "bg-warm/15 text-warm", icon: Sun, label: "Warm" },
  cold: { cls: "bg-primary/15 text-primary", icon: Snowflake, label: "Cold" },
  neutral: { cls: "bg-muted text-muted-foreground", icon: Minus, label: "Neutral" },
};

const STATUSES = ["new", "contacted", "qualified", "won", "lost"] as const;
type Status = (typeof STATUSES)[number];

const STATUS_STYLES: Record<Status, string> = {
  new: "bg-secondary text-secondary-foreground",
  contacted: "bg-primary/10 text-primary",
  qualified: "bg-warm/10 text-warm",
  won: "bg-success/10 text-success",
  lost: "bg-muted text-muted-foreground",
};

export default function Leads() {
  const { current } = useWorkspace();
  const { user } = useAuth();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<"mine" | "targets" | "signalhire" | "all">("mine");
  const [convLead, setConvLead] = useState<any | null>(null);
  const [sheetTab, setSheetTab] = useState<string>("profile");
  const [ownedProducts, setOwnedProducts] = useState<string[]>([]);

  const refresh = async () => {
    if (!current) return;
    setLoading(true);
    const [{ data }, { data: cp }] = await Promise.all([
      supabase
        .from("leads")
        .select("*")
        .eq("workspace_id", current.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("company_profiles")
        .select("products_summary, target_systems")
        .eq("workspace_id", current.id)
        .maybeSingle(),
    ]);
    setLeads(data ?? []);
    setOwnedProducts(extractOwnedProducts(cp?.products_summary, cp?.target_systems));
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  const convLeadMatches = useMemo(
    () => (convLead ? matchOwnedProducts(convLead, ownedProducts) : []),
    [convLead, ownedProducts],
  );

  const isTargetLead = (l: any) => l.source === "ai_targets";
  const isSignalHireLead = (l: any) => l.source === "signalhire";
  const targetsCount = leads.filter(isTargetLead).length;
  const signalhireCount = leads.filter(isSignalHireLead).length;
  const mineCount = leads.length - targetsCount - signalhireCount;

  const filtered = leads.filter((l) => {
    if (sourceFilter === "mine" && (isTargetLead(l) || isSignalHireLead(l))) return false;
    if (sourceFilter === "targets" && !isTargetLead(l)) return false;
    if (sourceFilter === "signalhire" && !isSignalHireLead(l)) return false;
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      l.company_name?.toLowerCase().includes(q) ||
      l.contact_name?.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q) ||
      l.role?.toLowerCase().includes(q)
    );
  });

  const updateStatus = async (id: string, status: Status, name: string) => {
    const { error } = await supabase.from("leads").update({ status }).eq("id", id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    if (current) {
      await logActivity(current.id, user?.id, "status_updated", `${name} → ${status}`);
    }
    refresh();
  };

  const exportCsv = () => {
    if (filtered.length === 0) return;
    const headers = ["company_name", "contact_name", "role", "email", "status", "score", "notes"];
    const rows = [
      headers.join(","),
      ...filtered.map((l) =>
        headers
          .map((h) => `"${String((l as any)[h] ?? "").replace(/"/g, '""')}"`)
          .join(",")
      ),
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground font-medium mb-1">
            {leads.length} leads in workspace
          </p>
          <h1 className="text-3xl lg:text-4xl font-display font-bold text-primary-deep">
            Lead Management
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
          <ImportDialog onImported={refresh} />
          <AddLeadDialog onCreated={refresh} />
        </div>
      </div>

      <div className="card-elevated overflow-hidden">
        <div className="px-4 pt-4">
          <Tabs value={sourceFilter} onValueChange={(v) => setSourceFilter(v as any)}>
            <TabsList>
              <TabsTrigger value="mine">My leads · {mineCount}</TabsTrigger>
              <TabsTrigger value="targets" className="relative pl-6">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-hot opacity-75 [animation:ping_0.8s_cubic-bezier(0,0,0.2,1)_infinite]" />
                  <span className="absolute inline-flex h-full w-full rounded-full bg-hot opacity-60 [animation:ping_0.8s_cubic-bezier(0,0,0.2,1)_infinite] [animation-delay:0.4s]" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-hot [animation:pulse_0.6s_ease-in-out_infinite] shadow-[0_0_8px_hsl(var(--hot))]" />
                </span>
                <span className="[animation:pulse_0.9s_ease-in-out_infinite] font-semibold">
                  AI hot picks · {targetsCount}
                </span>
              </TabsTrigger>
              <TabsTrigger value="signalhire">SignalHire · {signalhireCount}</TabsTrigger>
              <TabsTrigger value="all">All · {leads.length}</TabsTrigger>
            </TabsList>
          </Tabs>
          <p className="text-xs text-muted-foreground mt-2">
            {sourceFilter === "targets"
              ? "Companies you claimed from the AI Targets page."
              : sourceFilter === "signalhire"
              ? "Verified contacts claimed from the SignalHire database."
              : sourceFilter === "mine"
              ? "Leads you added or imported yourself."
              : "All leads in this workspace."}
          </p>
        </div>
        <div className="p-4 flex flex-col sm:flex-row gap-3 border-b border-border/60">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search company, contact, email..."
              className="pl-9 bg-muted/30 border-border/60"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/30 text-left">
                <th className="px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Company</th>
                <th className="px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Contact</th>
                <th className="px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Email</th>
                <th className="px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Last reply</th>
                <th className="px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Score</th>
                <th className="px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-4" colSpan={7}>
                      <Skeleton className="h-6 w-full" />
                    </td>
                  </tr>
                ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td className="px-5 py-12 text-center text-muted-foreground" colSpan={7}>
                    {leads.length === 0
                      ? "No leads yet. Add one or import a file."
                      : "No leads match your filters."}
                  </td>
                </tr>
              )}
              {filtered.map((lead) => {
                const tempMeta = lead.last_reply_temperature
                  ? TEMP_BADGE[lead.last_reply_temperature]
                  : null;
                const TempIcon = tempMeta?.icon;
                const matches = matchOwnedProducts(lead, ownedProducts);
                return (
                  <tr key={lead.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-md bg-secondary flex items-center justify-center text-[11px] font-bold text-secondary-foreground">
                          {lead.company_name?.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm text-primary-deep">{lead.company_name}</p>
                            {isTargetLead(lead) && (
                              <Badge className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/10 text-[10px] h-5">
                                Targeted
                              </Badge>
                            )}
                          </div>
                          {lead.industry && (
                            <p className="text-[11px] text-muted-foreground">{lead.industry}</p>
                          )}
                          {matches.length > 0 && (
                            <TooltipProvider delayDuration={150}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge className="mt-1 bg-success/15 text-success border border-success/30 hover:bg-success/15 text-[10px] h-5 gap-1 cursor-default">
                                    <CheckCircle2 className="h-2.5 w-2.5" />
                                    Existing user · {matches.length}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">Already using: {matches.join(", ")}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-foreground/90">{lead.contact_name || "—"}</p>
                      {lead.role && (
                        <p className="text-[11px] text-muted-foreground">{lead.role}</p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-muted-foreground">{lead.email || "—"}</p>
                    </td>
                    <td className="px-5 py-4">
                      {tempMeta && TempIcon ? (
                        <div className="flex flex-col gap-0.5">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md w-fit ${tempMeta.cls}`}>
                            <TempIcon className="h-3 w-3" />
                            {tempMeta.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {lead.reply_count ?? 0} repl{(lead.reply_count ?? 0) === 1 ? "y" : "ies"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm font-bold text-primary-deep">{lead.score ?? 0}</span>
                    </td>
                    <td className="px-5 py-4">
                      <Select
                        value={lead.status}
                        onValueChange={(v) => updateStatus(lead.id, v as Status, lead.company_name)}
                      >
                        <SelectTrigger className={`h-7 text-xs w-28 ${STATUS_STYLES[lead.status as Status]}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button size="sm" variant="ghost" onClick={() => { setSheetTab("profile"); setConvLead(lead); }}>
                        <MessageSquare className="h-3.5 w-3.5 mr-1" />
                        View
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Sheet open={!!convLead} onOpenChange={(o) => !o && setConvLead(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{convLead?.contact_name || convLead?.company_name}</SheetTitle>
            <SheetDescription>
              {convLead?.company_name} · {convLead?.email || "no email on file"}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4">
            {convLead && (
              <Tabs value={sheetTab} onValueChange={setSheetTab}>
                <TabsList>
                  <TabsTrigger value="profile">Profile</TabsTrigger>
                  <TabsTrigger value="intelligence">Intelligence</TabsTrigger>
                  <TabsTrigger value="email">Email</TabsTrigger>
                  <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
                </TabsList>
                <TabsContent value="profile" className="mt-4">
                  <LeadProfilePanel
                    lead={convLead}
                    ownedMatches={convLeadMatches}
                    onOpenIntelligence={() => setSheetTab("intelligence")}
                  />
                </TabsContent>
                <TabsContent value="intelligence" className="mt-4">
                  <LeadIntelligencePanel leadId={convLead.id} contactName={convLead.contact_name} />
                </TabsContent>
                <TabsContent value="email" className="mt-4">
                  <LeadEmailComposerPanel lead={convLead} />
                </TabsContent>
                <TabsContent value="whatsapp" className="mt-4">
                  <WhatsAppPanel leadId={convLead.id} />
                </TabsContent>
              </Tabs>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
