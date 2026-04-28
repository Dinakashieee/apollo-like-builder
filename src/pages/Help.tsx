import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, ChevronDown, BookOpen, LifeBuoy, PlayCircle, FileText, Mail, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const sections = [
  {
    title: "Getting Started",
    items: [
      { q: "How do I add my first lead?", a: "Click 'Add Lead' on the Dashboard or Leads page. You only need a company name to get started." },
      { q: "What's a workspace?", a: "Your private space for leads, opportunities, and team members. You get one when you sign up. You can invite teammates by email." },
    ],
  },
  {
    title: "CSV / Excel import",
    items: [
      { q: "What format should my file be?", a: "CSV or Excel (.xlsx, .xls). The first row should be column headers. Required: a column for company name. Optional: contact name, role, email, notes." },
      { q: "Can I preview before importing?", a: "Yes. After upload, we show field mapping, then a 5-row preview before final import." },
      { q: "What happens to invalid rows?", a: "Rows missing a company name are skipped. You'll see a count of inserted vs skipped at the end." },
    ],
  },
  {
    title: "AI insights",
    items: [
      { q: "How does the opportunity score work?", a: "AI analyzes your company profile + products and rates each opportunity area on fit, market size, and how well your product solves the problem (0–100)." },
      { q: "Why are some opportunities marked 🔥 vs ❄️?", a: "🔥 High = strong fit + clear pain. ⚠️ Medium = fit but harder sell. ❄️ Low = adjacent market, lower priority." },
      { q: "Can I regenerate?", a: "Yes — click 'Generate with AI' anytime to refresh." },
    ],
  },
  {
    title: "FAQ",
    items: [
      { q: "Is my data shared with other users?", a: "Never. Row-level security enforces strict workspace isolation in the database." },
      { q: "Can I delete my data?", a: "Yes. Settings → Your data → 'Delete all workspace data' or 'Delete my account'." },
      { q: "Do you sell my data?", a: "No. See our Privacy Policy." },
    ],
  },
];

export default function Help() {
  const [query, setQuery] = useState("");
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggle = (k: string) => {
    const next = new Set(openItems);
    next.has(k) ? next.delete(k) : next.add(k);
    setOpenItems(next);
  };

  const filteredSections = sections
    .map((s) => ({
      ...s,
      items: s.items.filter(
        (i) =>
          !query ||
          i.q.toLowerCase().includes(query.toLowerCase()) ||
          i.a.toLowerCase().includes(query.toLowerCase())
      ),
    }))
    .filter((s) => s.items.length > 0);

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-3xl lg:text-4xl font-display font-bold text-primary-deep">Help Center</h1>
        <p className="text-sm text-muted-foreground mt-1">Documentation, demo and support — all in one place.</p>
      </div>

      {/* 2-min demo video */}
      <div className="card-elevated overflow-hidden">
        <div className="aspect-video bg-black relative">
          <iframe
            className="absolute inset-0 w-full h-full"
            src="https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0"
            title="EngageIQ 2-minute demo"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <div className="p-4 flex items-center gap-3">
          <PlayCircle className="h-5 w-5 text-primary shrink-0" />
          <div>
            <p className="font-semibold text-sm text-primary-deep">2-minute product demo</p>
            <p className="text-xs text-muted-foreground">See how to add leads, generate AI emails, and find your top 5 prospects.</p>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <a href="#docs" className="card-elevated p-4 hover:border-primary/40 transition-colors group">
          <BookOpen className="h-5 w-5 text-primary mb-2" />
          <p className="font-semibold text-sm text-primary-deep">Documentation</p>
          <p className="text-xs text-muted-foreground">Setup, imports, AI features.</p>
        </a>
        <Link to="/app/support" className="card-elevated p-4 hover:border-primary/40 transition-colors group">
          <LifeBuoy className="h-5 w-5 text-primary mb-2" />
          <p className="font-semibold text-sm text-primary-deep">Contact Support</p>
          <p className="text-xs text-muted-foreground">Open a ticket — we reply fast.</p>
        </Link>
        <a href="mailto:support@engageiq.app" className="card-elevated p-4 hover:border-primary/40 transition-colors group">
          <Mail className="h-5 w-5 text-primary mb-2" />
          <p className="font-semibold text-sm text-primary-deep">Email us</p>
          <p className="text-xs text-muted-foreground">support@engageiq.app</p>
        </a>
      </div>

      <div id="docs" className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search documentation..."
          className="pl-9 h-11"
        />
      </div>

      {filteredSections.map((s) => (
        <section key={s.title}>
          <h2 className="font-display font-bold text-xl text-primary-deep mb-3">{s.title}</h2>
          <div className="space-y-2">
            {s.items.map((item, i) => {
              const k = `${s.title}-${i}`;
              const open = openItems.has(k);
              return (
                <div key={k} className="card-elevated overflow-hidden">
                  <button
                    onClick={() => toggle(k)}
                    className="w-full text-left p-4 flex items-center justify-between gap-3 hover:bg-muted/30"
                  >
                    <span className="font-semibold text-sm text-primary-deep">{item.q}</span>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
                  </button>
                  {open && (
                    <div className="px-4 pb-4 text-sm text-foreground/85 border-t border-border/60 pt-3">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
