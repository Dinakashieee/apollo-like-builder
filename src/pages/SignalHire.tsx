import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Edit3,
  Download,
  Trash2,
  ArrowLeftRight,
  HelpCircle,
  Building2,
  Filter,
  ChevronDown,
  ChevronUp,
  Sparkles,
  MapPin,
  Briefcase,
  User as UserIcon,
  ListChecks,
  AtSign,
  KeyRound,
  ExternalLink,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Zap,
  ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useSignalHireCredits } from "@/hooks/useSignalHireCredits";
import { useWorkspace } from "@/hooks/useWorkspace";
import { PayPalSmartButtons } from "@/components/PayPalSmartButtons";
import { cn } from "@/lib/utils";

type Lead = {
  id: string;
  name: string;
  initials: string;
  company: string;
  role: string;
  email: string;
  status: "valid" | "guess" | "invalid";
};

const MOCK_LEADS: Lead[] = [
  { id: "1", name: "Emily Gilbert", initials: "EG", company: "Apple", role: "Email Marketing Manager", email: "emily.gilbert@apple.com", status: "valid" },
  { id: "2", name: "Emmet Morse", initials: "EM", company: "Google", role: "Senior Manager, Marketing", email: "emmet.morse@google.com", status: "valid" },
  { id: "3", name: "Emma Watkins", initials: "EW", company: "Apple", role: "SEO Analyst", email: "emma.watkins@apple.com", status: "valid" },
  { id: "4", name: "Ella Ming Son", initials: "EM", company: "Meta", role: "Outbound Sales Executive", email: "ella.son@meta.com", status: "valid" },
  { id: "5", name: "Monique Smith", initials: "MS", company: "Google", role: "Copywriter, Lifestyle Creative", email: "monique.smith@google.com", status: "valid" },
  { id: "6", name: "Martha Hutchinson", initials: "MH", company: "Uber", role: "Marketing Director", email: "martha.h@uber.com", status: "valid" },
  { id: "7", name: "Ryan Tuotso", initials: "RT", company: "Accenture", role: "Senior Global Product Marketer", email: "ryan.tuotso@accenture.com", status: "valid" },
  { id: "8", name: "Marcus Delight", initials: "MD", company: "Accenture", role: "Head of Product, Accounting", email: "marcus.d@accenture.com", status: "valid" },
  { id: "9", name: "Daniella Rashford", initials: "DR", company: "Santander", role: "Lead Product Designer", email: "daniella.r@santander.com", status: "valid" },
  { id: "10", name: "Marcus Ndubusi", initials: "MN", company: "Accenture", role: "Lead Product Designer", email: "marcus.n@accenture.com", status: "valid" },
  { id: "11", name: "Sophia Bennett", initials: "SB", company: "Stripe", role: "Growth Marketing Lead", email: "sophia.bennett@stripe.com", status: "valid" },
  { id: "12", name: "Liam Carter", initials: "LC", company: "Airbnb", role: "Sr. Product Manager", email: "liam.carter@airbnb.com", status: "valid" },
];

const INITIAL_LISTS = [
  { name: "LinkedIn Leads", count: 100000 },
  { name: "Outbound Q1", count: 12480 },
  { name: "Enterprise ICP", count: 4320 },
];

function Avatar({ initials }: { initials: string }) {
  return (
    <div className="h-7 w-7 rounded-full grid place-items-center text-[11px] font-semibold bg-primary/10 text-primary">
      {initials}
    </div>
  );
}

function CompanyChip({ name }: { name: string }) {
  return (
    <div className="inline-flex items-center gap-2">
      <span className="h-5 w-5 rounded grid place-items-center text-[10px] font-bold bg-muted text-foreground/70">
        {name[0]}
      </span>
      <span className="text-sm text-foreground font-medium">{name}</span>
    </div>
  );
}

function EmailBar() {
  return (
    <div className="flex gap-1 items-center">
      <span className="h-2 w-12 rounded-full bg-muted" />
      <span className="h-2 w-20 rounded-full bg-muted" />
      <span className="h-2 w-8 rounded-full bg-muted" />
    </div>
  );
}

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function leadsToCSV(leads: Lead[]) {
  const header = ["Name", "Company", "Email", "Job Role", "Status"];
  const rows = leads.map((l) =>
    [l.name, l.company, l.email, l.role, l.status].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
  );
  return [header.join(","), ...rows].join("\n");
}

function leadsToXLS(leads: Lead[]) {
  // Excel-readable XML spreadsheet (.xls)
  const rows = leads
    .map(
      (l) => `<Row>
        <Cell><Data ss:Type="String">${l.name}</Data></Cell>
        <Cell><Data ss:Type="String">${l.company}</Data></Cell>
        <Cell><Data ss:Type="String">${l.email}</Data></Cell>
        <Cell><Data ss:Type="String">${l.role}</Data></Cell>
        <Cell><Data ss:Type="String">${l.status}</Data></Cell>
      </Row>`
    )
    .join("");
  return `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="Leads"><Table>
<Row>
  <Cell><Data ss:Type="String">Name</Data></Cell>
  <Cell><Data ss:Type="String">Company</Data></Cell>
  <Cell><Data ss:Type="String">Email</Data></Cell>
  <Cell><Data ss:Type="String">Job Role</Data></Cell>
  <Cell><Data ss:Type="String">Status</Data></Cell>
</Row>
${rows}
</Table></Worksheet></Workbook>`;
}

export default function SignalHire() {
  const [lists, setLists] = useState(INITIAL_LISTS);
  const [activeList, setActiveList] = useState("LinkedIn Leads");
  const [selected, setSelected] = useState<string[]>([]);
  const [showFilters] = useState(true);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [query, setQuery] = useState("");
  const [listSearch, setListSearch] = useState("");
  const [activeRail, setActiveRail] = useState("Lists");
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [connected, setConnected] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [packMode, setPackMode] = useState<"once" | "monthly">("once");
  const [selectedPack, setSelectedPack] = useState<string | null>(null);
  const { current: workspace } = useWorkspace();
  const { balance: signalhireBalance, lifetimePurchased, refetch: refetchCredits } = useSignalHireCredits();

  useEffect(() => {
    const dismissed = localStorage.getItem("signalhire_connect_dismissed");
    const saved = localStorage.getItem("signalhire_connected");
    if (saved === "true") setConnected(true);
    if (!dismissed && saved !== "true") {
      const t = setTimeout(() => setShowConnectModal(true), 400);
      return () => clearTimeout(t);
    }
  }, []);

  const filtered = useMemo(() => {
    if (!query) return MOCK_LEADS;
    const q = query.toLowerCase();
    return MOCK_LEADS.filter(
      (l) => l.name.toLowerCase().includes(q) || l.company.toLowerCase().includes(q) || l.role.toLowerCase().includes(q)
    );
  }, [query]);

  const visibleLists = useMemo(() => {
    if (!listSearch) return lists;
    return lists.filter((l) => l.name.toLowerCase().includes(listSearch.toLowerCase()));
  }, [lists, listSearch]);

  const allSelected = selected.length === filtered.length && filtered.length > 0;
  const toggleAll = () => setSelected(allSelected ? [] : filtered.map((l) => l.id));
  const toggleOne = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const creditsUsed = Math.max(0, lifetimePurchased - signalhireBalance);
  const creditsTotal = Math.max(lifetimePurchased, signalhireBalance, 0);
  const creditsPct = creditsTotal > 0 ? (creditsUsed / creditsTotal) * 100 : 0;

  const handleConnect = () => {
    if (!apiKey.trim()) {
      toast({ title: "API key required", description: "Paste your live SignalHire API key to connect.", variant: "destructive" });
      return;
    }
    localStorage.setItem("signalhire_connected", "true");
    setConnected(true);
    setShowConnectModal(false);
    setShowUpgradeModal(false);
    toast({ title: "SignalHire connected", description: "Your live account is now linked. Credits will sync shortly." });
  };

  const handleDismiss = () => {
    localStorage.setItem("signalhire_connect_dismissed", "true");
    setShowConnectModal(false);
  };

  const exportLeads = (format: "csv" | "xls") => {
    const rows = selected.length > 0 ? filtered.filter((l) => selected.includes(l.id)) : filtered;
    if (format === "csv") {
      downloadFile(`${activeList.replace(/\s+/g, "_")}.csv`, leadsToCSV(rows), "text/csv");
    } else {
      downloadFile(`${activeList.replace(/\s+/g, "_")}.xls`, leadsToXLS(rows), "application/vnd.ms-excel");
    }
    toast({ title: "Export ready", description: `${rows.length} leads exported as ${format.toUpperCase()}.` });
  };

  const handleNewList = () => {
    const name = window.prompt("Name your new list");
    if (!name?.trim()) return;
    setLists((l) => [...l, { name: name.trim(), count: 0 }]);
    setActiveList(name.trim());
    toast({ title: "List created", description: `${name.trim()} is ready.` });
  };

  const handleDeleteList = () => {
    if (lists.length <= 1) {
      toast({ title: "Cannot delete", description: "Keep at least one list.", variant: "destructive" });
      return;
    }
    setLists((l) => l.filter((x) => x.name !== activeList));
    const next = lists.find((x) => x.name !== activeList);
    if (next) setActiveList(next.name);
    toast({ title: "List deleted" });
  };

  const handleCrmSync = () => {
    if (selected.length === 0) return;
    toast({ title: "CRM sync started", description: `Syncing ${selected.length} leads to your CRM.` });
  };

  const handleDeleteLeads = () => {
    if (selected.length === 0) return;
    toast({ title: "Leads removed", description: `${selected.length} leads removed from this list.` });
    setSelected([]);
  };

  const handleEnrich = () => {
    toast({ title: "Enrichment queued", description: "We're enriching these leads with verified contact data." });
  };

  const handleSearch = () => {
    toast({ title: "Search running", description: "Pulling matching leads from SignalHire." });
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground font-medium mb-1">
            Claim verified leads from the SignalHire database
          </p>
          <h1 className="text-3xl lg:text-4xl font-display font-bold text-primary-deep">
            SignalHire Claim
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {connected ? (
            <Badge variant="secondary" className="gap-1.5 bg-success/10 text-success border-success/20">
              <CheckCircle2 className="h-3.5 w-3.5" /> SignalHire connected
            </Badge>
          ) : (
            <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowConnectModal(true)}>
              <KeyRound className="h-4 w-4" /> Connect SignalHire
            </Button>
          )}
          <Button size="sm" className="gap-2" onClick={() => setShowUpgradeModal(true)}>
            <Sparkles className="h-4 w-4" /> Upgrade Account
          </Button>
        </div>
      </div>

      {/* Credits */}
      <div className="card-elevated p-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-muted-foreground font-medium">SignalHire Reveal Credits</span>
            <span className="font-semibold text-foreground">
              {signalhireBalance.toLocaleString()} available
              {lifetimePurchased > 0 && (
                <span className="text-muted-foreground font-normal">
                  {" · "}{creditsUsed.toLocaleString()} used of {lifetimePurchased.toLocaleString()} purchased
                </span>
              )}
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary" style={{ width: `${creditsPct}%` }} />
          </div>
        </div>
        <Button
          variant="default"
          size="sm"
          className="gap-1.5"
          onClick={() => { setSelectedPack(null); setShowUpgradeModal(true); }}
        >
          <ShoppingCart className="h-3.5 w-3.5" /> Buy credits
        </Button>
      </div>

      {/* Main workspace */}
      <div className="card-elevated overflow-hidden">
        <div className="grid grid-cols-[56px_260px_1fr] min-h-[640px]">
          {/* Icon rail */}
          <div className="border-r border-border/60 py-4 flex flex-col items-center gap-2 bg-muted/20">
            {[
              { icon: Building2, label: "Companies" },
              { icon: ListChecks, label: "Lists" },
              { icon: Search, label: "Search" },
              { icon: AtSign, label: "Email" },
            ].map(({ icon: Icon, label }) => (
              <button
                key={label}
                title={label}
                onClick={() => {
                  setActiveRail(label);
                  if (label !== "Lists") toast({ title: label, description: `${label} workspace coming up.` });
                }}
                className={cn(
                  "h-9 w-9 rounded-lg grid place-items-center transition-colors active:scale-95",
                  activeRail === label ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>

          {/* Lists column */}
          <div className="border-r border-border/60 p-4 relative">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">All Lists ({lists.length})</h2>
              <button
                onClick={() => exportLeads("csv")}
                className="text-xs font-medium text-primary hover:underline"
              >
                Export
              </button>
            </div>
            <div className="relative mb-3">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                placeholder="Search lists"
                className="pl-8 h-9 bg-muted/30 border-border/60"
              />
            </div>
            <Button className="w-full mb-4 gap-2" size="sm" onClick={handleNewList}>
              <Plus className="h-4 w-4" /> New List
            </Button>

            <div className="space-y-1">
              {visibleLists.map((list) => (
                <button
                  key={list.name}
                  onClick={() => setActiveList(list.name)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center justify-between transition-colors active:scale-[0.99]",
                    activeList === list.name
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-muted text-foreground/80"
                  )}
                >
                  <span className="truncate">{list.name}</span>
                  <span className="text-xs text-muted-foreground">{list.count.toLocaleString()}</span>
                </button>
              ))}
            </div>

            {/* Filters card */}
            {showFilters && (
              <div className="mt-6 bg-card border border-border rounded-xl shadow-sm">
                <Tabs defaultValue="lead">
                  <TabsList className="w-full grid grid-cols-2 rounded-none rounded-t-xl bg-transparent border-b border-border h-auto p-0">
                    <TabsTrigger
                      value="lead"
                      className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-2.5 text-xs font-semibold"
                    >
                      Lead Search
                    </TabsTrigger>
                    <TabsTrigger
                      value="company"
                      className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-2.5 text-xs font-semibold"
                    >
                      Company
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="lead" className="m-0">
                    <div className="px-3 pt-2.5 pb-2 flex items-center justify-between border-b border-border/60">
                      <span className="text-xs font-semibold flex items-center gap-1.5">
                        <Filter className="h-3 w-3" /> Filters
                      </span>
                      <button
                        onClick={() => toast({ title: "Filters reset" })}
                        className="text-[11px] font-medium text-primary hover:underline"
                      >
                        Reset
                      </button>
                    </div>

                    <button
                      onClick={() => setFiltersExpanded(!filtersExpanded)}
                      className="w-full px-3 py-2.5 flex items-center justify-between text-xs font-semibold hover:bg-muted/40"
                    >
                      Lead Information
                      {filtersExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>

                    {filtersExpanded && (
                      <div className="px-3 pb-3 space-y-2.5">
                        <div>
                          <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 mb-1">
                            <UserIcon className="h-3 w-3" /> Name
                          </label>
                          <Input placeholder="John Doe" className="h-8 text-xs" />
                        </div>
                        <div>
                          <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 mb-1">
                            <Briefcase className="h-3 w-3" /> Job Title
                          </label>
                          <Input placeholder="Head of Product" className="h-8 text-xs" />
                        </div>
                        <div>
                          <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 mb-1">
                            <MapPin className="h-3 w-3" /> Location
                          </label>
                          <Input placeholder="Los Angeles, CA" className="h-8 text-xs" />
                        </div>
                      </div>
                    )}

                    <div className="p-2.5 border-t border-border/60 bg-muted/20 rounded-b-xl">
                      <Button className="w-full" size="sm" onClick={handleSearch}>Search</Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="company" className="m-0 p-3 space-y-2.5">
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Company Name</label>
                      <Input placeholder="Acme Corp" className="h-8 text-xs" />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Industry</label>
                      <Input placeholder="SaaS" className="h-8 text-xs" />
                    </div>
                    <Button className="w-full" size="sm" onClick={handleSearch}>Search</Button>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>

          {/* Leads table */}
          <div className="p-5 min-w-0">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">{activeList}</h2>
                <button
                  onClick={() => {
                    const next = window.prompt("Rename list", activeList);
                    if (next?.trim()) {
                      setLists((l) => l.map((x) => (x.name === activeList ? { ...x, name: next.trim() } : x)));
                      setActiveList(next.trim());
                    }
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleEnrich}
                  title="Enrich"
                  className="h-8 w-8 rounded-lg border border-border grid place-items-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors active:scale-95"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => toast({ title: "Company view", description: "Grouping leads by company." })}
                  title="Companies"
                  className="h-8 w-8 rounded-lg border border-border grid place-items-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors active:scale-95"
                >
                  <Building2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={handleCrmSync}
                  title="CRM Sync"
                  className="h-8 w-8 rounded-lg border border-border grid place-items-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors active:scale-95"
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      title="Export"
                      className="h-8 w-8 rounded-lg border border-border grid place-items-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors active:scale-95"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onClick={() => exportLeads("xls")} className="gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-success" /> Excel (.xls)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportLeads("csv")} className="gap-2">
                      <FileText className="h-4 w-4 text-primary" /> CSV (.csv)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <button
                  onClick={handleDeleteList}
                  title="Delete list"
                  className="h-8 w-8 rounded-lg border border-border grid place-items-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors active:scale-95"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">100,000</span> results ·{" "}
                <span className="font-semibold text-foreground">20</span> displayed
              </p>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name or email"
                    className="pl-8 h-9 w-[220px] bg-muted/30 border-border/60"
                  />
                </div>
                <Button variant="outline" size="sm" className="gap-2" disabled={selected.length === 0} onClick={handleCrmSync}>
                  <ArrowLeftRight className="h-3.5 w-3.5" /> CRM Sync
                </Button>
                <Button variant="outline" size="sm" disabled={selected.length === 0} onClick={handleDeleteLeads}>
                  Delete
                </Button>
              </div>
            </div>

            <div className="border border-border rounded-xl overflow-hidden">
              <div className="grid grid-cols-[40px_1.4fr_1fr_1.6fr_0.9fr_1.6fr] items-center px-4 py-3 bg-muted/30 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                <div>Name</div>
                <div>Company</div>
                <div>Email</div>
                <div className="flex items-center gap-1">
                  <HelpCircle className="h-3 w-3" /> Status
                </div>
                <div>Job Role</div>
              </div>

              <div className="divide-y divide-border/60 max-h-[480px] overflow-y-auto">
                {filtered.map((lead) => (
                  <div
                    key={lead.id}
                    className="grid grid-cols-[40px_1.4fr_1fr_1.6fr_0.9fr_1.6fr] items-center px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => toggleOne(lead.id)}
                  >
                    <Checkbox
                      checked={selected.includes(lead.id)}
                      onCheckedChange={() => toggleOne(lead.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar initials={lead.initials} />
                      <span className="text-sm font-medium truncate">{lead.name}</span>
                    </div>
                    <CompanyChip name={lead.company} />
                    <EmailBar />
                    <Badge variant="secondary" className="bg-success/10 text-success border-success/20 gap-1 w-fit">
                      <CheckCircle2 className="h-3 w-3" /> Valid
                    </Badge>
                    <span className="text-sm text-foreground/80 truncate">{lead.role}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-4">
              Claim leads pulled from SignalHire's live database. Filter by role, company, or location and sync directly to your CRM.
            </p>
          </div>
        </div>
      </div>

      {/* Connect SignalHire Modal */}
      <Dialog open={showConnectModal} onOpenChange={setShowConnectModal}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <div className="h-11 w-11 rounded-xl bg-primary/10 grid place-items-center mb-2">
              <KeyRound className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-xl">Connect your live SignalHire account</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              We support the SignalHire API directly inside EngageIQ. Connect your live account
              to claim leads, pull verified emails, and sync them to your CRM — all without leaving the platform.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-muted/40 border border-border/60 p-3 space-y-2 text-xs">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" />
                <span>Reuse your existing SignalHire credits in EngageIQ.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" />
                <span>One-click CRM sync for every claimed lead.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" />
                <span>Your key is stored encrypted — never exposed to the browser.</span>
              </div>
            </div>

            <div>
              <Label htmlFor="sh-api-key" className="text-xs font-semibold">SignalHire Live API Key</Label>
              <Input
                id="sh-api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Paste your live API key"
                className="mt-1.5"
              />
              <a
                href="https://www.signalhire.com/api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-primary hover:underline inline-flex items-center gap-1 mt-1.5"
              >
                Where do I find my API key? <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={handleDismiss}>
              Maybe later
            </Button>
            <Button onClick={handleConnect} className="gap-2">
              <KeyRound className="h-4 w-4" /> Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Buy Credits Modal — powered by EngageIQ's managed SignalHire account */}
      <Dialog open={showUpgradeModal} onOpenChange={(o) => { setShowUpgradeModal(o); if (!o) setSelectedPack(null); }}>
        <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="h-11 w-11 rounded-xl bg-primary/10 grid place-items-center mb-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-xl">Buy SignalHire reveal credits</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              Billed through EngageIQ at <span className="font-semibold text-foreground">$0.25 / credit</span>.
              Powered by EngageIQ's managed SignalHire account — no key needed. 1 credit = 1 verified email reveal.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={packMode} onValueChange={(v) => { setPackMode(v as "once" | "monthly"); setSelectedPack(null); }} className="mt-2">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="once">Pay once</TabsTrigger>
              <TabsTrigger value="monthly">Monthly auto-refill</TabsTrigger>
            </TabsList>

            {(["once", "monthly"] as const).map((mode) => {
              const packs = [
                { credits: 100, price: 25, planId: mode === "once" ? "sh_credits_100_once" : "sh_credits_100_monthly" },
                { credits: 500, price: 125, planId: mode === "once" ? "sh_credits_500_once" : "sh_credits_500_monthly" },
                { credits: 1000, price: 250, planId: mode === "once" ? "sh_credits_1k_once" : "sh_credits_1k_monthly", popular: true },
                { credits: 5000, price: 1250, planId: mode === "once" ? "sh_credits_5k_once" : "sh_credits_5k_monthly" },
              ];
              return (
                <TabsContent key={mode} value={mode} className="mt-4 space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {packs.map((p) => {
                      const active = selectedPack === p.planId;
                      return (
                        <button
                          key={p.planId}
                          onClick={() => setSelectedPack(p.planId)}
                          className={cn(
                            "relative text-left rounded-xl border-2 p-3 transition-all active:scale-[0.98]",
                            active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
                          )}
                        >
                          {p.popular && (
                            <Badge className="absolute -top-2 right-2 text-[10px] py-0 px-1.5">Popular</Badge>
                          )}
                          <div className="text-lg font-bold text-foreground">{p.credits.toLocaleString()}</div>
                          <div className="text-[11px] text-muted-foreground mb-1.5">credits</div>
                          <div className="text-sm font-semibold text-primary">
                            ${p.price}
                            {mode === "monthly" && <span className="text-[11px] text-muted-foreground font-normal">/mo</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {selectedPack && workspace?.id && (
                    <div className="rounded-xl border border-border/60 p-4 bg-muted/20 space-y-3">
                      <p className="text-xs text-muted-foreground">
                        {mode === "once"
                          ? "One-time purchase. Credits never expire and sit in your EngageIQ wallet until used."
                          : "Charged monthly via PayPal. Credits added to your wallet on every renewal. Cancel anytime."}
                      </p>
                      <PayPalSmartButtons
                        planId={selectedPack}
                        workspaceId={workspace.id}
                        onSuccess={() => {
                          refetchCredits();
                          setShowUpgradeModal(false);
                          setSelectedPack(null);
                          toast({ title: "Credits added", description: "Your SignalHire reveal credits are ready to use." });
                        }}
                      />
                    </div>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>

          <div className="mt-4 rounded-lg border border-border/40 bg-muted/20 p-3 flex items-start gap-3">
            <KeyRound className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-foreground mb-0.5">Already paying SignalHire directly?</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Connect your live API key instead and reuse credits you already own — no extra fees.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => { setShowUpgradeModal(false); setShowConnectModal(true); }}
            >
              Connect key
            </Button>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowUpgradeModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
