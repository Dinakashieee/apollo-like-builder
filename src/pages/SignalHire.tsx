import { useMemo, useState } from "react";
import {
  Search,
  Plus,
  Edit3,
  CheckCircle2,
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
  Mail,
  ListChecks,
  AtSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type Lead = {
  id: string;
  name: string;
  initials: string;
  company: string;
  companyColor: string;
  role: string;
  status: "valid" | "guess" | "invalid";
};

const MOCK_LEADS: Lead[] = [
  { id: "1", name: "Emily Gilbert", initials: "EG", company: "Apple", companyColor: "bg-zinc-900 text-white", role: "Email Marketing Manager", status: "valid" },
  { id: "2", name: "Emmet Morse", initials: "EM", company: "Google", companyColor: "bg-blue-500 text-white", role: "Senior Manager, Marketing", status: "valid" },
  { id: "3", name: "Emma Watkins", initials: "EW", company: "Apple", companyColor: "bg-zinc-900 text-white", role: "SEO Analyst", status: "valid" },
  { id: "4", name: "Ella Ming Son", initials: "EM", company: "Meta", companyColor: "bg-blue-600 text-white", role: "Outbound Sales Executive", status: "valid" },
  { id: "5", name: "Monique Smith", initials: "MS", company: "Google", companyColor: "bg-blue-500 text-white", role: "Copywriter, Lifestyle Creative", status: "valid" },
  { id: "6", name: "Martha Hutchinson", initials: "MH", company: "Uber", companyColor: "bg-zinc-900 text-white", role: "Marketing Director", status: "valid" },
  { id: "7", name: "Ryan Tuotso", initials: "RT", company: "Accenture", companyColor: "bg-fuchsia-600 text-white", role: "Senior Global Product Marketer", status: "valid" },
  { id: "8", name: "Marcus Delight", initials: "MD", company: "Accenture", companyColor: "bg-fuchsia-600 text-white", role: "Head of Product, Accounting", status: "valid" },
  { id: "9", name: "Daniella Rashford", initials: "DR", company: "Santander", companyColor: "bg-red-600 text-white", role: "Lead Product Designer", status: "valid" },
  { id: "10", name: "Marcus Ndubusi", initials: "MN", company: "Accenture", companyColor: "bg-fuchsia-600 text-white", role: "Lead Product Designer", status: "valid" },
  { id: "11", name: "Sophia Bennett", initials: "SB", company: "Stripe", companyColor: "bg-indigo-600 text-white", role: "Growth Marketing Lead", status: "valid" },
  { id: "12", name: "Liam Carter", initials: "LC", company: "Airbnb", companyColor: "bg-rose-500 text-white", role: "Sr. Product Manager", status: "valid" },
];

const LISTS = [
  { name: "LinkedIn Leads", count: 100000, active: true },
  { name: "Outbound Q1", count: 12480 },
  { name: "Enterprise ICP", count: 4320 },
];

function Avatar({ initials }: { initials: string }) {
  const palette = ["bg-amber-100 text-amber-900", "bg-emerald-100 text-emerald-900", "bg-sky-100 text-sky-900", "bg-rose-100 text-rose-900", "bg-violet-100 text-violet-900"];
  const idx = initials.charCodeAt(0) % palette.length;
  return (
    <div className={cn("h-7 w-7 rounded-full grid place-items-center text-[11px] font-semibold", palette[idx])}>
      {initials}
    </div>
  );
}

function CompanyChip({ name, color }: { name: string; color: string }) {
  return (
    <div className="inline-flex items-center gap-2">
      <span className={cn("h-5 w-5 rounded grid place-items-center text-[10px] font-bold", color)}>
        {name[0]}
      </span>
      <span className="text-sm text-primary font-medium">{name}</span>
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

  return (
    <div className="p-4 md:p-6">
      {/* Outer "device" card matching the reference */}
      <div className="rounded-3xl bg-gradient-to-b from-sky-50/60 to-background border border-border/60 p-4 md:p-6">
        <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
          {/* Top bar */}
          <div className="flex items-center gap-4 px-5 py-3 border-b border-border/60">
            <div className="h-9 w-9 rounded-lg bg-primary grid place-items-center text-primary-foreground font-bold">
              S
            </div>
            <h1 className="text-lg font-semibold">Lists</h1>

            <div className="ml-auto flex items-center gap-5">
              <div className="hidden md:flex items-center gap-3 min-w-[260px]">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Email Finder Credits</span>
                    <span className="font-medium">
                      {creditsUsed.toLocaleString()}/{(creditsTotal / 1000).toFixed(0)}K
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${creditsPct}%` }} />
                  </div>
                </div>
              </div>
              <Button variant="ghost" className="text-primary gap-2">
                <Sparkles className="h-4 w-4" /> Upgrade Account
              </Button>
              <button className="h-8 w-8 rounded-full border border-border grid place-items-center text-muted-foreground hover:bg-muted">
                <HelpCircle className="h-4 w-4" />
              </button>
              <div className="h-9 w-9 rounded-full bg-rose-200 text-rose-900 grid place-items-center text-xs font-semibold">
                MO
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="grid grid-cols-[64px_280px_1fr] min-h-[640px]">
            {/* Icon rail */}
            <div className="border-r border-border/60 py-4 flex flex-col items-center gap-3 bg-muted/20">
              <button className="h-9 w-9 rounded-lg grid place-items-center text-muted-foreground hover:bg-muted">
                <Building2 className="h-4 w-4" />
              </button>
              <button className="h-9 w-9 rounded-lg grid place-items-center bg-primary/10 text-primary">
                <ListChecks className="h-4 w-4" />
              </button>
              <button className="h-9 w-9 rounded-lg grid place-items-center text-muted-foreground hover:bg-muted">
                <Search className="h-4 w-4" />
              </button>
              <button className="h-9 w-9 rounded-lg grid place-items-center text-muted-foreground hover:bg-muted">
                <AtSign className="h-4 w-4" />
              </button>
            </div>

            {/* Lists column */}
            <div className="border-r border-border/60 p-4 relative">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold">All Lists ({LISTS.length})</h2>
                <button className="text-xs font-medium text-primary hover:underline">Export Lists</button>
              </div>
              <div className="relative mb-3">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search" className="pl-8 h-9 bg-muted/40 border-border/60" />
              </div>
              <Button className="w-full mb-4 gap-2">
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

              {/* Filter card overlay (Lead/Company search) */}
              {showFilters && (
                <div className="absolute left-2 top-44 w-[300px] z-10 bg-card border border-border rounded-xl shadow-2xl">
                  <Tabs defaultValue="lead">
                    <TabsList className="w-full grid grid-cols-2 rounded-none rounded-t-xl bg-transparent border-b border-border h-auto p-0">
                      <TabsTrigger
                        value="lead"
                        className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 font-semibold"
                      >
                        Lead Search
                      </TabsTrigger>
                      <TabsTrigger
                        value="company"
                        className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 font-semibold"
                      >
                        Company Search
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="lead" className="m-0">
                      <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-border/60">
                        <span className="text-sm font-semibold flex items-center gap-2">
                          <Filter className="h-3.5 w-3.5" /> Filters
                        </span>
                        <button className="text-xs font-medium text-primary hover:underline">Reset All</button>
                      </div>

                      <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        <UserIcon className="h-3.5 w-3.5" /> Lead
                      </div>

                      <button
                        onClick={() => setFiltersExpanded(!filtersExpanded)}
                        className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold hover:bg-muted/40"
                      >
                        Lead Information
                        {filtersExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>

                      {filtersExpanded && (
                        <div className="px-4 pb-4 space-y-3">
                          <div>
                            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1.5">
                              <UserIcon className="h-3 w-3" /> Name
                            </label>
                            <Input placeholder="John Doe" className="h-9" />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1.5">
                              <Briefcase className="h-3 w-3" /> Job Title
                            </label>
                            <Input placeholder="Head of Product" className="h-9" />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1.5">
                              <MapPin className="h-3 w-3" /> Location
                            </label>
                            <Input placeholder="Los Angeles, California, United States" className="h-9" />
                          </div>
                        </div>
                      )}

                      <div className="px-4 py-3 border-t border-border/60 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5" /> Company
                      </div>

                      <div className="p-3 border-t border-border/60 bg-muted/30 rounded-b-xl">
                        <Button className="w-full">Search</Button>
                      </div>
                    </TabsContent>

                    <TabsContent value="company" className="m-0 p-4">
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                            Company Name
                          </label>
                          <Input placeholder="Acme Corp" className="h-9" />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                            Industry
                          </label>
                          <Input placeholder="SaaS" className="h-9" />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                            Headcount
                          </label>
                          <Input placeholder="100-500" className="h-9" />
                        </div>
                        <Button className="w-full">Search</Button>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </div>

            {/* Leads table column */}
            <div className="p-5 min-w-0">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">{activeList}</h2>
                  <button className="text-muted-foreground hover:text-foreground">
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  {[Sparkles, Building2, ArrowLeftRight, Download, Trash2].map((Icon, i) => (
                    <button
                      key={i}
                      className="h-9 w-9 rounded-lg border border-primary/30 grid place-items-center text-primary hover:bg-primary/10"
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">100,000</span> results{" "}
                  <span className="font-semibold text-foreground">20</span> displayed
                </p>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search by name or email"
                      className="pl-8 h-9 w-[240px] bg-muted/40 border-border/60"
                    />
                  </div>
                  <Button variant="outline" size="sm" className="gap-2" disabled={selected.length === 0}>
                    <ArrowLeftRight className="h-3.5 w-3.5" /> CRM Sync
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2" disabled={selected.length === 0}>
                    Delete
                  </Button>
                </div>
              </div>

              <div className="border border-border rounded-xl overflow-hidden">
                <div className="grid grid-cols-[40px_1.4fr_1fr_1.6fr_0.9fr_1.6fr] items-center px-4 py-3 bg-muted/40 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                  <div>Name</div>
                  <div>Company</div>
                  <div>Email</div>
                  <div className="flex items-center gap-1">
                    <HelpCircle className="h-3 w-3" /> Email Status
                  </div>
                  <div>Job Role</div>
                </div>

                <div className="divide-y divide-border max-h-[480px] overflow-y-auto">
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
                        <span className="font-medium text-sm truncate">{lead.name}</span>
                      </div>
                      <div>
                        <CompanyChip name={lead.company} color={lead.companyColor} />
                      </div>
                      <div>
                        <EmailBar />
                      </div>
                      <div>
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 rounded-full font-medium border-0 px-3">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Valid
                        </Badge>
                      </div>
                      <div className="text-sm text-foreground/80 truncate">{lead.role}</div>
                    </div>
                  ))}
                </div>
              </div>

              <p className="mt-4 text-xs text-muted-foreground">
                Claim leads pulled from SignalHire's database. Filter by role, company, or location and sync directly to your CRM.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
