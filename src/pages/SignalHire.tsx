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
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Lead = {
  id: string;
  name: string;
  initials: string;
  company: string;
  role: string;
  status: "valid" | "guess" | "invalid";
};

const MOCK_LEADS: Lead[] = [
  { id: "1", name: "Emily Gilbert", initials: "EG", company: "Apple", role: "Email Marketing Manager", status: "valid" },
  { id: "2", name: "Emmet Morse", initials: "EM", company: "Google", role: "Senior Manager, Marketing", status: "valid" },
  { id: "3", name: "Emma Watkins", initials: "EW", company: "Apple", role: "SEO Analyst", status: "valid" },
  { id: "4", name: "Ella Ming Son", initials: "EM", company: "Meta", role: "Outbound Sales Executive", status: "valid" },
  { id: "5", name: "Monique Smith", initials: "MS", company: "Google", role: "Copywriter, Lifestyle Creative", status: "valid" },
  { id: "6", name: "Martha Hutchinson", initials: "MH", company: "Uber", role: "Marketing Director", status: "valid" },
  { id: "7", name: "Ryan Tuotso", initials: "RT", company: "Accenture", role: "Senior Global Product Marketer", status: "valid" },
  { id: "8", name: "Marcus Delight", initials: "MD", company: "Accenture", role: "Head of Product, Accounting", status: "valid" },
  { id: "9", name: "Daniella Rashford", initials: "DR", company: "Santander", role: "Lead Product Designer", status: "valid" },
  { id: "10", name: "Marcus Ndubusi", initials: "MN", company: "Accenture", role: "Lead Product Designer", status: "valid" },
  { id: "11", name: "Sophia Bennett", initials: "SB", company: "Stripe", role: "Growth Marketing Lead", status: "valid" },
  { id: "12", name: "Liam Carter", initials: "LC", company: "Airbnb", role: "Sr. Product Manager", status: "valid" },
];

const LISTS = [
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

export default function SignalHire() {
  const [activeList, setActiveList] = useState("LinkedIn Leads");
  const [selected, setSelected] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(true);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [query, setQuery] = useState("");
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [connected, setConnected] = useState(false);
  const [apiKey, setApiKey] = useState("");

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

  const allSelected = selected.length === filtered.length && filtered.length > 0;
  const toggleAll = () => setSelected(allSelected ? [] : filtered.map((l) => l.id));
  const toggleOne = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const creditsUsed = 1455;
  const creditsTotal = 150000;
  const creditsPct = (creditsUsed / creditsTotal) * 100;

  const handleConnect = () => {
    if (!apiKey.trim()) {
      toast({ title: "API key required", description: "Paste your SignalHire API key to connect.", variant: "destructive" });
      return;
    }
    localStorage.setItem("signalhire_connected", "true");
    setConnected(true);
    setShowConnectModal(false);
    toast({ title: "SignalHire connected", description: "Your account is now linked. Credits will sync shortly." });
  };

  const handleDismiss = () => {
    localStorage.setItem("signalhire_connect_dismissed", "true");
    setShowConnectModal(false);
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
          <Button size="sm" className="gap-2">
            <Sparkles className="h-4 w-4" /> Upgrade
          </Button>
        </div>
      </div>

      {/* Credits */}
      <div className="card-elevated p-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-muted-foreground font-medium">Email Finder Credits</span>
            <span className="font-semibold text-foreground">
              {creditsUsed.toLocaleString()} / {creditsTotal.toLocaleString()}
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary" style={{ width: `${creditsPct}%` }} />
          </div>
        </div>
        <Button variant="ghost" size="sm" className="text-primary gap-1.5">
          <HelpCircle className="h-3.5 w-3.5" /> How credits work
        </Button>
      </div>

      {/* Main workspace */}
      <div className="card-elevated overflow-hidden">
        <div className="grid grid-cols-[56px_260px_1fr] min-h-[640px]">
          {/* Icon rail */}
          <div className="border-r border-border/60 py-4 flex flex-col items-center gap-2 bg-muted/20">
            {[
              { icon: Building2, label: "Companies" },
              { icon: ListChecks, label: "Lists", active: true },
              { icon: Search, label: "Search" },
              { icon: AtSign, label: "Email" },
            ].map(({ icon: Icon, label, active }) => (
              <button
                key={label}
                title={label}
                className={cn(
                  "h-9 w-9 rounded-lg grid place-items-center transition-colors",
                  active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>

          {/* Lists column */}
          <div className="border-r border-border/60 p-4 relative">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">All Lists ({LISTS.length})</h2>
              <button className="text-xs font-medium text-primary hover:underline">Export</button>
            </div>
            <div className="relative mb-3">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search lists" className="pl-8 h-9 bg-muted/30 border-border/60" />
            </div>
            <Button className="w-full mb-4 gap-2" size="sm">
              <Plus className="h-4 w-4" /> New List
            </Button>

            <div className="space-y-1">
              {LISTS.map((list) => (
                <button
                  key={list.name}
                  onClick={() => setActiveList(list.name)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center justify-between transition-colors",
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
                      <button className="text-[11px] font-medium text-primary hover:underline">Reset</button>
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
                      <Button className="w-full" size="sm">Search</Button>
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
                    <Button className="w-full" size="sm">Search</Button>
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
                <button className="text-muted-foreground hover:text-foreground">
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                {[
                  { icon: Sparkles, label: "Enrich" },
                  { icon: Building2, label: "Companies" },
                  { icon: ArrowLeftRight, label: "Sync" },
                  { icon: Download, label: "Export" },
                  { icon: Trash2, label: "Delete" },
                ].map(({ icon: Icon, label }) => (
                  <button
                    key={label}
                    title={label}
                    className="h-8 w-8 rounded-lg border border-border grid place-items-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </button>
                ))}
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
                <Button variant="outline" size="sm" className="gap-2" disabled={selected.length === 0}>
                  <ArrowLeftRight className="h-3.5 w-3.5" /> CRM Sync
                </Button>
                <Button variant="outline" size="sm" disabled={selected.length === 0}>
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
                    className="grid grid-cols-[40px_1.4fr_1fr_1.6fr_0.9fr_1.6fr] items-center px-4 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <Checkbox
                      checked={selected.includes(lead.id)}
                      onCheckedChange={() => toggleOne(lead.id)}
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
              Claim leads pulled from SignalHire's database. Filter by role, company, or location and sync directly to your CRM.
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
            <DialogTitle className="text-xl">Connect your SignalHire account</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              We support the SignalHire API directly inside EngageIQ. Connect your account
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
              <Label htmlFor="sh-api-key" className="text-xs font-semibold">SignalHire API Key</Label>
              <Input
                id="sh-api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sh_live_..."
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
    </div>
  );
}
