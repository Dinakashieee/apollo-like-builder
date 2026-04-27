import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Download, Mail, Phone } from "lucide-react";

const STATUSES = ["waiting", "invited", "converted", "rejected"] as const;
type Status = (typeof STATUSES)[number];

const STATUS_STYLES: Record<Status, string> = {
  waiting: "bg-warm/10 text-warm",
  invited: "bg-primary/10 text-primary",
  converted: "bg-success/10 text-success",
  rejected: "bg-muted text-muted-foreground",
};

export default function Waitlist() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const refresh = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("waitlist_signups")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Could not load waitlist", description: error.message, variant: "destructive" });
    }
    setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const filtered = rows.filter((r) => filter === "all" || r.status === filter);

  const updateStatus = async (id: string, status: Status) => {
    const { error } = await supabase.from("waitlist_signups").update({ status }).eq("id", id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    refresh();
  };

  const exportCsv = () => {
    if (filtered.length === 0) return;
    const headers = [
      "full_name",
      "business_name",
      "designation",
      "email",
      "mobile",
      "status",
      "notes",
      "created_at",
    ];
    const lines = [
      headers.join(","),
      ...filtered.map((r) =>
        headers
          .map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`)
          .join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `waitlist-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const counts = {
    total: rows.length,
    waiting: rows.filter((r) => r.status === "waiting").length,
    invited: rows.filter((r) => r.status === "invited").length,
    converted: rows.filter((r) => r.status === "converted").length,
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground font-medium mb-1">
            {counts.total} total signups · {counts.waiting} waiting
          </p>
          <h1 className="text-3xl lg:text-4xl font-display font-bold text-primary-deep">
            Waitlist
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: counts.total },
          { label: "Waiting", value: counts.waiting },
          { label: "Invited", value: counts.invited },
          { label: "Converted", value: counts.converted },
        ].map((s) => (
          <div key={s.label} className="card-elevated p-4">
            <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
            <p className="text-2xl font-display font-bold text-primary-deep">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="card-elevated overflow-hidden">
        <div className="p-4 flex items-center gap-3 border-b border-border/60">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Showing {filtered.length} of {rows.length}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/30 text-left">
                <th className="px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Person</th>
                <th className="px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Business</th>
                <th className="px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Contact</th>
                <th className="px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Notes</th>
                <th className="px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading &&
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-4" colSpan={5}>
                      <Skeleton className="h-6 w-full" />
                    </td>
                  </tr>
                ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td className="px-5 py-12 text-center text-muted-foreground" colSpan={5}>
                    No signups yet. Share your landing page to start collecting requests.
                  </td>
                </tr>
              )}
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-muted/30 transition-colors align-top">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-sm text-primary-deep">{r.full_name}</p>
                    <p className="text-[11px] text-muted-foreground">{r.designation}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-sm text-foreground/90">{r.business_name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <a
                      href={`mailto:${r.email}`}
                      className="text-sm text-primary hover:underline flex items-center gap-1.5"
                    >
                      <Mail className="h-3 w-3" /> {r.email}
                    </a>
                    <a
                      href={`tel:${r.mobile}`}
                      className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-1"
                    >
                      <Phone className="h-3 w-3" /> {r.mobile}
                    </a>
                  </td>
                  <td className="px-5 py-4 max-w-xs">
                    <p className="text-xs text-muted-foreground line-clamp-3">
                      {r.notes || "—"}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <Select
                      value={r.status}
                      onValueChange={(v) => updateStatus(r.id, v as Status)}
                    >
                      <SelectTrigger className={`h-7 text-xs w-32 ${STATUS_STYLES[r.status as Status]}`}>
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
