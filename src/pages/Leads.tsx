import { useEffect, useState } from "react";
import { Search, Filter, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Skeleton } from "@/components/ui/skeleton";
import { AddLeadDialog } from "@/components/AddLeadDialog";
import { ImportDialog } from "@/components/ImportDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { logActivity } from "@/lib/activities";
import { useAuth } from "@/hooks/useAuth";

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

  const refresh = async () => {
    if (!current) return;
    setLoading(true);
    const { data } = await supabase
      .from("leads")
      .select("*")
      .eq("workspace_id", current.id)
      .order("created_at", { ascending: false });
    setLeads(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  const filtered = leads.filter((l) => {
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
                <th className="px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Score</th>
                <th className="px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-4" colSpan={5}>
                      <Skeleton className="h-6 w-full" />
                    </td>
                  </tr>
                ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td className="px-5 py-12 text-center text-muted-foreground" colSpan={5}>
                    {leads.length === 0
                      ? "No leads yet. Add one or import a file."
                      : "No leads match your filters."}
                  </td>
                </tr>
              )}
              {filtered.map((lead) => (
                <tr key={lead.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-md bg-secondary flex items-center justify-center text-[11px] font-bold text-secondary-foreground">
                        {lead.company_name?.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-primary-deep">{lead.company_name}</p>
                        {lead.industry && (
                          <p className="text-[11px] text-muted-foreground">{lead.industry}</p>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
