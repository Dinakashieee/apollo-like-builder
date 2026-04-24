import { Search, Filter, Download, Plus, MoreHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AvatarBubble } from "@/components/AvatarBubble";
import { StatusBadge } from "@/components/StatusBadge";
import { leads } from "@/data/leads";
import { useState } from "react";

export default function Leads() {
  const [query, setQuery] = useState("");
  const filtered = leads.filter(
    (l) =>
      l.name.toLowerCase().includes(query.toLowerCase()) ||
      l.company.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground font-medium mb-1">258 leads · Updated 5 mins ago</p>
          <h1 className="text-3xl lg:text-4xl font-display font-bold text-primary-deep">
            Lead Management
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
          <Button size="sm" className="bg-gradient-primary shadow-glow">
            <Plus className="h-4 w-4 mr-2" /> Add Lead
          </Button>
        </div>
      </div>

      <div className="card-elevated overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 flex flex-col sm:flex-row gap-3 border-b border-border/60">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search leads, companies, titles..."
              className="pl-9 bg-muted/30 border-border/60"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-border/60">
              <Filter className="h-4 w-4 mr-2" /> Filters
              <span className="ml-2 text-[10px] bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">3</span>
            </Button>
            {(["Hot", "Warm", "Cold"] as const).map((s) => (
              <button
                key={s}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-border/60 hover:bg-muted transition-colors hidden md:inline-flex"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/30 text-left">
                <th className="px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Contact</th>
                <th className="px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Title</th>
                <th className="px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Company</th>
                <th className="px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tools</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((lead, i) => (
                <tr
                  key={lead.id}
                  className="hover:bg-muted/30 transition-colors animate-fade-up"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <AvatarBubble lead={lead} />
                      <div>
                        <p className="font-semibold text-sm text-primary-deep">{lead.name}</p>
                        <p className="text-xs text-muted-foreground">{lead.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-sm text-foreground/80">{lead.title}</p>
                    <p className="text-[11px] text-muted-foreground">{lead.industry}</p>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-md bg-secondary flex items-center justify-center text-[10px] font-bold text-secondary-foreground">
                        {lead.companyShort}
                      </div>
                      <span className="text-sm font-medium text-foreground/90">{lead.company}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={lead.status} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1">
                      {lead.tools.map((t) => (
                        <span
                          key={t}
                          className="text-[10px] font-semibold bg-accent text-accent-foreground px-2 py-0.5 rounded-md"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border/60 flex items-center justify-between bg-muted/20">
          <p className="text-xs text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filtered.length}</span> of 258 leads · 7 new today
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs">Prev</Button>
            <Button size="sm" className="h-7 text-xs bg-primary">Next</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
