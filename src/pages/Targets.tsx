import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Target, RefreshCw, Building2, ExternalLink, Users, Crosshair, CheckCircle2, Flag, Layers, Linkedin, ShieldCheck, ShieldOff, HelpCircle, X, TrendingUp, Lock, Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { useEntitlements } from "@/hooks/useEntitlements";
import { UpgradeModal } from "@/components/UpgradeModal";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

type RefType = "pdf" | "linkedin" | "web";
interface RefLink {
  label: string;
  url: string;
  type?: RefType;
}

function refType(r: RefLink): RefType {
  if (r.type) return r.type;
  const l = (r.url ?? "").toLowerCase();
  if (l.endsWith(".pdf") || l.includes(".pdf?")) return "pdf";
  if (l.includes("linkedin.com")) return "linkedin";
  return "web";
}

function RefChip({ r }: { r: RefLink }) {
  const t = refType(r);
  const Icon = t === "pdf" ? FileText : t === "linkedin" ? Linkedin : ExternalLink;
  const tone =
    t === "pdf"
      ? "bg-warm/10 text-warm border-warm/30"
      : t === "linkedin"
      ? "bg-[#0a66c2]/10 text-[#0a66c2] border-[#0a66c2]/30"
      : "bg-primary/5 text-primary border-primary/15";
  return (
    <a
      href={r.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 text-[11px] hover:underline border rounded px-2 py-0.5 ${tone}`}
    >
      <Icon className="h-3 w-3" />
      <span className="truncate max-w-[200px]">{r.label || (t === "linkedin" ? "LinkedIn" : t === "pdf" ? "PDF" : "Link")}</span>
    </a>
  );
}

interface SimilarProduct {
  name: string;
  category: string;
  strengths: string[];
  weaknesses: string[];
  audience: string;
  your_advantage: string;
  references?: RefLink[];
}

interface IcpContact {
  full_name: string;
  role: string;
  linkedin_url: string;
}

interface TargetCompany {
  // new shape
  company?: string;
  website?: string;
  size?: string;
  designations?: string[];
  focus_areas?: string[];
  references?: RefLink[];
  uses_ifs?: boolean | null;
  current_systems?: string[];
  icp_contacts?: IcpContact[];
  // legacy shape (kept for backward compat with cached data)
  type?: string;
  industry: string;
  problem: string;
  why: string;
  level: "high" | "medium" | "low";
}

interface MarketFilterContext {
  companyName?: string | null;
  description?: string | null;
  productsSummary?: string | null;
  targetSystems?: string[] | null;
}

const LEVEL_BADGES = {
  high: { label: "🔥 High", color: "bg-hot/15 text-hot border-hot/30" },
  medium: { label: "⚠️ Medium", color: "bg-warm/15 text-warm border-warm/30" },
  low: { label: "❄️ Low", color: "bg-cold/15 text-cold border-cold/30" },
};

const REPLACEMENT_TIMEOUT_MS = 60000;

const normalizeMarketText = (value: unknown) =>
  (value ?? "").toString().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const PROVIDER_SIGNALS = [
  "implementation partner", "implement", "implementation", "reseller", "system integrator", "systems integrator",
  "integrator", "consultancy", "consulting", "it services", "software development", "software vendor",
  "solution provider", "solutions provider", "managed service", "msp", "var", "digital transformation",
  "erp consultant", "crm consultant", "partner"
];

const ENTERPRISE_VENDOR_TERMS = [
  "ifs", "sap", "oracle", "microsoft dynamics", "dynamics", "infor", "epicor", "workday", "netsuite",
  "sage", "odoo", "salesforce", "servicenow", "siemens plm", "hubspot", "zoho"
];

const SERVICE_NAME_SUFFIXES = [
  "technologies", "technology", "solutions", "systems", "services", "consulting", "consultancy",
  "labs", "digital", "infotech", "softlabs", "soft", "informatics", "softech", "tech",
  "softwares", "software"
];

const isCompetitorTarget = (target: TargetCompany, context: MarketFilterContext | null, similar: SimilarProduct[] = []) => {
  const targetName = normalizeMarketText(target.company ?? target.type);
  if (!targetName || !context) return false;

  const sellerName = normalizeMarketText(context.companyName);
  if (sellerName && (targetName.includes(sellerName) || sellerName.includes(targetName))) return true;
  if (similar.some((item) => normalizeMarketText(item.name) === targetName)) return true;

  // Reject names that end in a services-firm suffix word (e.g. "Acme Technologies", "Foo Solutions")
  const nameTokens = targetName.split(" ").filter(Boolean);
  const lastToken = nameTokens[nameTokens.length - 1] ?? "";
  if (SERVICE_NAME_SUFFIXES.includes(lastToken)) return true;

  const sellerText = normalizeMarketText([
    context.companyName,
    context.description,
    context.productsSummary,
    ...(context.targetSystems ?? []),
  ].filter(Boolean).join(" "));
  const sellerVendors = ENTERPRISE_VENDOR_TERMS.filter((term) => sellerText.includes(normalizeMarketText(term)));
  const sellerTerms = Array.from(new Set([
    ...sellerVendors,
    ...(context.targetSystems ?? []).flatMap((term) => normalizeMarketText(term).split(" ")),
    ...sellerText.split(" "),
  ].filter((term) => term.length > 3 && !["your", "company", "services", "solutions", "business", "with", "from", "that", "this", "their"].includes(term))));

  const targetText = normalizeMarketText([
    target.company,
    target.type,
    target.website,
    target.industry,
    target.problem,
    target.why,
    ...(target.current_systems ?? []),
    ...(target.focus_areas ?? []),
    ...(target.designations ?? []),
    ...((target.icp_contacts ?? []).flatMap((c) => [c?.role, c?.full_name])),
  ].filter(Boolean).join(" "));

  if (sellerVendors.some((vendor) => targetName.includes(normalizeMarketText(vendor)))) return true;
  const isProvider = PROVIDER_SIGNALS.some((signal) => targetText.includes(normalizeMarketText(signal)));
  const overlapsSellerOffer = sellerTerms.some((term) => targetText.includes(term)) || /\berp\b|\bcrm\b|enterprise application|business software|cloud software/.test(targetText);
  return isProvider && overlapsSellerOffer;
};

const filterTargetCompanies = (nextTargets: TargetCompany[], context: MarketFilterContext | null, similar: SimilarProduct[] = []) =>
  nextTargets.filter((target) => !isCompetitorTarget(target, context, similar));

const withTimeout = async <T,>(promise: Promise<T>, message: string): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), REPLACEMENT_TIMEOUT_MS);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Try again";

export default function Targets() {
  const { current } = useWorkspace();
  const { user } = useAuth();
  const { leadsUsed, leadsLimit, leadsAtLimit, leadsNearLimit, tier, refetch: refetchEntitlements } = useEntitlements();
  const [similar, setSimilar] = useState<SimilarProduct[]>([]);
  const [targets, setTargets] = useState<TargetCompany[]>([]);
  const [claimed, setClaimed] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [replacingIdx, setReplacingIdx] = useState<number | null>(null);
  const [decliningIdx, setDecliningIdx] = useState<number | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [hasCompany, setHasCompany] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [revealed, setRevealed] = useState<TargetCompany | null>(null);
  const [marketContext, setMarketContext] = useState<MarketFilterContext | null>(null);

  const netNewCount = useMemo(
    () => targets.filter((t) => t.uses_ifs === false).length,
    [targets]
  );

  useEffect(() => {
    if (!current) return;
    let cachedTargets: TargetCompany[] = [];
    let cachedSimilar: SimilarProduct[] = [];
    const cached = localStorage.getItem(`targets-${current.id}`);
    if (cached) {
      try {
        const j = JSON.parse(cached);
        cachedSimilar = j.similar ?? [];
        cachedTargets = j.targets ?? [];
        setSimilar(cachedSimilar);
        setTargets(cachedTargets);
      } catch {
        localStorage.removeItem(`targets-${current.id}`);
      }
    }
    supabase
      .from("company_profiles")
      .select("id, company_name, description, products_summary, target_systems")
      .eq("workspace_id", current.id)
      .maybeSingle()
      .then(({ data }) => {
        setHasCompany(!!data);
        const context = data
          ? {
              companyName: data.company_name,
              description: data.description,
              productsSummary: data.products_summary,
              targetSystems: data.target_systems,
            }
          : null;
        setMarketContext(context);
        if (context && cachedTargets.length > 0) {
          const filteredTargets = filterTargetCompanies(cachedTargets, context, cachedSimilar);
          setTargets(filteredTargets);
          if (filteredTargets.length !== cachedTargets.length) persist(cachedSimilar, filteredTargets);
        }
      });
    const claimedRaw = localStorage.getItem(`targets-claimed-${current.id}`);
    if (claimedRaw) {
      try { setClaimed(JSON.parse(claimedRaw) ?? []); } catch { localStorage.removeItem(`targets-claimed-${current.id}`); }
    }
  }, [current]);

  const persist = (nextSimilar: SimilarProduct[], nextTargets: TargetCompany[]) => {
    if (!current) return;
    localStorage.setItem(
      `targets-${current.id}`,
      JSON.stringify({ similar: nextSimilar, targets: nextTargets })
    );
  };

  const persistClaimed = (next: string[]) => {
    if (!current) return;
    setClaimed(next);
    localStorage.setItem(`targets-claimed-${current.id}`, JSON.stringify(next));
  };

  const generate = async () => {
    if (!current) return;
    if (!hasCompany) {
      toast({
        title: "Add your company first",
        description: "Go to Company to add your profile.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-targets", {
        body: { workspace_id: current.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const safeSimilar = data.similar ?? [];
      const safeTargets = filterTargetCompanies(data.targets ?? [], marketContext, safeSimilar);
      setSimilar(data.similar ?? []);
      setTargets(safeTargets);
      persist(safeSimilar, safeTargets);
      toast({ title: "Insights generated" });
    } catch (e: unknown) {
      toast({ title: "Failed", description: getErrorMessage(e), variant: "destructive" });
    }
    setLoading(false);
  };

  const fetchReplacementTarget = async (extraExclude: string[] = []) => {
    const exclude = Array.from(
      new Set([
        ...targets.map((t) => t.company ?? t.type ?? "").filter(Boolean),
        ...claimed,
        ...extraExclude,
      ])
    );
    const { data, error } = await withTimeout(
      supabase.functions.invoke("generate-targets", {
        body: { workspace_id: current!.id, mode: "replace", exclude },
      }),
      "Replacement target took too long to load."
    );
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    const safeTargets = filterTargetCompanies(data.targets ?? [], marketContext, similar);
    return safeTargets[0] as TargetCompany | undefined;
  };

  const fetchReplacement = async (idx: number, extraExclude: string[] = []) => {
    const replacement = await fetchReplacementTarget(extraExclude);
    const nextTargets = [...targets];
    if (replacement) nextTargets[idx] = replacement;
    else nextTargets.splice(idx, 1);
    setTargets(nextTargets);
    persist(similar, nextTargets);
    return replacement;
  };

  const claimAndReplace = async (idx: number) => {
    if (!current) return;
    const original = targets[idx];
    const name = original?.company ?? original?.type ?? "Target";

    // Push for subscription: claiming consumes a lead slot.
    if (leadsAtLimit) {
      setUpgradeOpen(true);
      return;
    }

    setReplacingIdx(idx);
    try {
      // Save as a real lead so the user can't just copy the name & search elsewhere.
      const primaryContact = original?.icp_contacts?.[0];
      const { error: insertErr } = await supabase.from("leads").insert({
        workspace_id: current.id,
        created_by: user?.id ?? null,
        company_name: name,
        contact_name: primaryContact?.full_name ?? null,
        role: primaryContact?.role ?? null,
        industry: original?.industry ?? null,
        systems_in_use: original?.current_systems ?? [],
        notes: [
          original?.problem ? `Problem: ${original.problem}` : null,
          original?.why ? `Why fit: ${original.why}` : null,
          original?.website ? `Website: ${original.website}` : null,
          primaryContact?.linkedin_url ? `LinkedIn: ${primaryContact.linkedin_url}` : null,
        ].filter(Boolean).join("\n") || null,
        source: "ai_targets",
      });
      if (insertErr) throw insertErr;
    } catch (e: unknown) {
      toast({ title: "Couldn't claim", description: getErrorMessage(e), variant: "destructive" });
      setReplacingIdx(null);
      return;
    }

    // Lead saved — finish the claim immediately. Replacement generation is best-effort only.
    const nextClaimed = Array.from(new Set([...claimed, name]));
    persistClaimed(nextClaimed);
    refetchEntitlements().catch(() => undefined);
    const withoutClaimedTarget = targets.filter((_, i) => i !== idx);
    setTargets(withoutClaimedTarget);
    persist(similar, withoutClaimedTarget);
    toast({ title: `Claimed ${name}`, description: "Added to your Leads." });
    setRevealed(original);
    setReplacingIdx(null);

    // Try to fetch a replacement target in the background. Failures must never block claiming.
    try {
      const replacement = await fetchReplacementTarget([name]);
      if (!replacement) return;
      setTargets((currentTargets) => {
        const replacementName = replacement.company ?? replacement.type ?? "";
        if (replacementName && currentTargets.some((target) => (target.company ?? target.type ?? "") === replacementName)) {
          return currentTargets;
        }
        const nextTargets = [...currentTargets];
        nextTargets.splice(Math.min(idx, nextTargets.length), 0, replacement);
        persist(similar, nextTargets);
        return nextTargets;
      });
      toast({ title: "Fresh target loaded" });
    } catch {
      // Replacement is best-effort; the lead has already been claimed successfully.
    }
  };

  const declineAndReplace = async (idx: number) => {
    if (!current) return;
    const original = targets[idx];
    const name = original?.company ?? original?.type ?? "Target";
    setDecliningIdx(idx);
    try {
      await fetchReplacement(idx, [name]);
      toast({ title: `Skipped ${name}`, description: "Swapped in a fresh prospect." });
    } catch (e: unknown) {
      toast({ title: "Couldn't refresh", description: getErrorMessage(e), variant: "destructive" });
    }
    setDecliningIdx(null);
  };

  const loadFreshTarget = async () => {
    if (!current) return;
    setAddingNew(true);
    try {
      const replacement = await fetchReplacementTarget();
      if (!replacement) {
        toast({ title: "No new targets right now", description: "Try again in a moment." });
        return;
      }
      const replacementName = replacement.company ?? replacement.type ?? "";
      if (replacementName && targets.some((t) => (t.company ?? t.type ?? "") === replacementName)) {
        toast({ title: "Already on the list", description: "Try again for a different prospect." });
        return;
      }
      const nextTargets = [...targets, replacement];
      setTargets(nextTargets);
      persist(similar, nextTargets);
      toast({ title: "Fresh target added" });
    } catch (e: unknown) {
      toast({ title: "Couldn't load a fresh target", description: getErrorMessage(e), variant: "destructive" });
    }
    setAddingNew(false);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm text-primary font-medium mb-1 flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5" /> Market intelligence
          </p>
          <h1 className="text-3xl lg:text-4xl font-display font-bold text-primary-deep">
            Targets & Competitors
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            See similar products, your advantage, and the best companies to sell to.
          </p>
        </div>
        <Button onClick={generate} disabled={loading} className="bg-gradient-primary shadow-glow">
          {loading ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          {loading ? "Analyzing..." : "Generate with AI"}
        </Button>
      </div>

      {!hasCompany && (
        <div className="card-elevated p-6 border-warm/40 bg-warm/5">
          <div className="flex gap-3">
            <Building2 className="h-5 w-5 text-warm shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-primary-deep">Add your company first</p>
              <p className="text-sm text-muted-foreground">
                We need your company profile to generate market insights.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Similar products */}
      <section>
        <h2 className="text-xl font-display font-bold text-primary-deep mb-3">Products like yours</h2>
        {loading && <Skeleton className="h-40 rounded-2xl" />}
        {!loading && similar.length === 0 && hasCompany && (
          <p className="text-sm text-muted-foreground card-elevated p-6 text-center">
            Generate to see competitor analysis and your advantage.
          </p>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {similar.map((p, i) => (
            <div key={i} className="card-elevated p-6">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-display font-bold text-primary-deep">{p.name}</h3>
                <span className="text-[10px] font-semibold bg-secondary text-secondary-foreground px-2 py-0.5 rounded">
                  {p.category}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-4">Targets: {p.audience}</p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="font-semibold text-success mb-1">Strengths</p>
                  <ul className="space-y-1 text-foreground/80">
                    {p.strengths.map((s, j) => (
                      <li key={j}>• {s}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-destructive mb-1">Weaknesses</p>
                  <ul className="space-y-1 text-foreground/80">
                    {p.weaknesses.map((s, j) => (
                      <li key={j}>• {s}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border/60">
                <p className="text-xs font-semibold text-primary mb-1">Your advantage</p>
                <p className="text-sm text-foreground/85">{p.your_advantage}</p>
              </div>
              {p.references && p.references.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/60">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">References</p>
                  <div className="flex flex-wrap gap-1.5">
                    {p.references.map((r, j) => (
                      <RefChip key={j} r={r} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Best companies */}
      <section>
        <div className="flex items-end justify-between gap-3 mb-3 flex-wrap">
          <div>
            <h2 className="text-xl font-display font-bold text-primary-deep">Best companies to target</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Hit <span className="font-semibold text-primary">Claim</span> to add them to your Leads — or <span className="font-semibold text-primary">Decline</span> to swap in a different prospect.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {netNewCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-primary/10 text-primary border border-primary/30 rounded-full px-3 py-1">
                <TrendingUp className="h-3.5 w-3.5" />
                {netNewCount} net-new {netNewCount === 1 ? "logo" : "logos"}
              </span>
            )}
            {claimed.length > 0 && (
              <Link
                to="/app/leads"
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-success/10 text-success border border-success/30 rounded-full px-3 py-1 hover:bg-success/20 transition-colors"
                title="View claimed leads"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {claimed.length} claimed · View leads
                <ExternalLink className="h-3 w-3" />
              </Link>
            )}
            {isFinite(leadsLimit) && (
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1 border ${
                  leadsAtLimit
                    ? "bg-destructive/10 text-destructive border-destructive/30"
                    : leadsNearLimit
                    ? "bg-warm/10 text-warm border-warm/30"
                    : "bg-muted text-muted-foreground border-border"
                }`}
              >
                {leadsUsed}/{leadsLimit} leads {leadsAtLimit ? "· upgrade to claim" : ""}
              </span>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={loadFreshTarget}
              disabled={addingNew || loading || !hasCompany}
            >
              {addingNew ? (
                <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5 mr-1.5" />
              )}
              {addingNew ? "Loading..." : "Load fresh target"}
            </Button>
          </div>
        </div>
        {!loading && targets.length === 0 && hasCompany && (
          <p className="text-sm text-muted-foreground card-elevated p-6 text-center">
            Generate to see ideal customer profiles.
          </p>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {targets.map((t, i) => {
            const lvl = LEVEL_BADGES[t.level] ?? LEVEL_BADGES.medium;
            const title = t.company ?? t.type ?? "Target";
            const isReplacing = replacingIdx === i;
            const isDeclining = decliningIdx === i;
            const isBusy = isReplacing || isDeclining;
            return (
              <div key={i} className={`card-elevated p-6 relative transition-opacity ${isBusy ? "opacity-60" : ""}`}>
                {isBusy && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/70 backdrop-blur-sm rounded-2xl">
                    <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      {isDeclining ? "Finding another prospect..." : "Saving & refreshing..."}
                    </div>
                  </div>
                )}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <h3 className="font-display font-bold text-primary-deep truncate">{title}</h3>
                    {t.website && (
                      <p className="text-xs text-muted-foreground italic">Website revealed after claiming</p>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold border px-2 py-1 rounded-md whitespace-nowrap ${lvl.color}`}>
                    {lvl.label}
                  </span>
                </div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">
                  {t.industry}{t.size ? ` • ${t.size}` : ""}
                </p>
                {(t.uses_ifs !== undefined || (t.current_systems && t.current_systems.length > 0)) && (
                  <div className="flex flex-wrap items-center gap-1.5 mb-3">
                    {t.uses_ifs === true && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-success/10 text-success border border-success/30 rounded-full px-2 py-0.5">
                        <ShieldCheck className="h-3 w-3" /> Existing IFS user
                      </span>
                    )}
                    {t.uses_ifs === false && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-warm/10 text-warm border border-warm/30 rounded-full px-2 py-0.5">
                        <ShieldOff className="h-3 w-3" /> Not on IFS
                      </span>
                    )}
                    {(t.uses_ifs === null || t.uses_ifs === undefined) && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-muted text-muted-foreground border border-border rounded-full px-2 py-0.5">
                        <HelpCircle className="h-3 w-3" /> IFS status unknown
                      </span>
                    )}
                    {t.current_systems?.map((s, j) => (
                      <span key={j} className="inline-flex items-center gap-1 text-[11px] bg-primary/5 text-primary-deep border border-primary/15 rounded-full px-2 py-0.5">
                        <Layers className="h-3 w-3" /> {s}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-1 mb-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 text-center">
                  <p className="text-sm font-semibold text-primary-deep flex items-center justify-center gap-1.5">
                    <Lock className="h-3.5 w-3.5" /> Claim to unlock the full brief
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Website, pain points, why-you-fit, decision-maker LinkedIn profiles, designations & verifiable references all appear in your Leads once you claim.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1 bg-card border border-border rounded-full px-2 py-0.5"><Crosshair className="h-3 w-3" /> Their problem</span>
                    <span className="inline-flex items-center gap-1 bg-card border border-border rounded-full px-2 py-0.5"><Users className="h-3 w-3" /> {t.icp_contacts?.length ?? 0} ICP contacts</span>
                    <span className="inline-flex items-center gap-1 bg-card border border-border rounded-full px-2 py-0.5"><Linkedin className="h-3 w-3" /> LinkedIn URLs</span>
                    <span className="inline-flex items-center gap-1 bg-card border border-border rounded-full px-2 py-0.5"><ExternalLink className="h-3 w-3" /> {t.references?.length ?? 0} references</span>
                  </div>
                </div>
                <div className="border-t border-border/60 pt-4 mt-4 flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-[11px] text-muted-foreground leading-tight flex-1 min-w-[140px]">
                    <Flag className="h-3 w-3 inline mr-1 -mt-0.5" />
                    Claiming <span className="font-semibold text-primary-deep">{title}</span> adds it to your Leads so you don't lose it.
                  </p>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => declineAndReplace(i)}
                      disabled={isBusy || replacingIdx !== null || decliningIdx !== null}
                    >
                      <X className="h-3.5 w-3.5 mr-1.5" />
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => claimAndReplace(i)}
                      disabled={isBusy || replacingIdx !== null || decliningIdx !== null}
                      className="bg-gradient-primary shadow-glow"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                      Claim lead
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        title="You've hit your lead limit"
        description={`You're on the ${tier} plan (${leadsUsed}/${leadsLimit} leads). Add a +100 leads add-on for $8/mo, or upgrade your plan to keep claiming targets.`}
      />

      <Dialog open={!!revealed} onOpenChange={(o) => !o && setRevealed(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              {revealed?.company ?? revealed?.type ?? "Target"} — full brief unlocked
            </DialogTitle>
            <DialogDescription>
              Saved to your Leads. Here's everything we know about this account.
            </DialogDescription>
          </DialogHeader>

          {revealed && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {revealed.website && (
                  <Field label="Website">
                    <a href={revealed.website.startsWith("http") ? revealed.website : `https://${revealed.website}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                      {revealed.website} <ExternalLink className="h-3 w-3" />
                    </a>
                  </Field>
                )}
                {revealed.industry && <Field label="Industry">{revealed.industry}</Field>}
                {revealed.size && <Field label="Company size">{revealed.size}</Field>}
                <Field label="IFS status">
                  {revealed.uses_ifs === true ? "Existing IFS user" : revealed.uses_ifs === false ? "Not on IFS" : "Unknown"}
                </Field>
              </div>

              {revealed.problem && (
                <Section title="Their problem" icon={Crosshair}>
                  <p className="text-sm text-foreground/90 leading-relaxed">{revealed.problem}</p>
                </Section>
              )}

              {revealed.why && (
                <Section title="Why you fit" icon={Sparkles}>
                  <p className="text-sm text-foreground/90 leading-relaxed">{revealed.why}</p>
                </Section>
              )}

              {revealed.current_systems && revealed.current_systems.length > 0 && (
                <Section title="Systems they use today" icon={Layers}>
                  <div className="flex flex-wrap gap-1.5">
                    {revealed.current_systems.map((s, i) => (
                      <span key={i} className="text-[11px] bg-primary/5 text-primary-deep border border-primary/15 rounded-full px-2 py-0.5">{s}</span>
                    ))}
                  </div>
                </Section>
              )}

              {revealed.designations && revealed.designations.length > 0 && (
                <Section title="Decision-maker designations" icon={Users}>
                  <div className="flex flex-wrap gap-1.5">
                    {revealed.designations.map((d, i) => (
                      <span key={i} className="text-[11px] bg-secondary text-secondary-foreground rounded-full px-2 py-0.5">{d}</span>
                    ))}
                  </div>
                </Section>
              )}

              {revealed.icp_contacts && revealed.icp_contacts.length > 0 && (
                <Section title="ICP contacts" icon={Users}>
                  <div className="space-y-2">
                    {revealed.icp_contacts.map((c, i) => (
                      <div key={i} className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border/60 bg-muted/20">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-primary-deep">{c.full_name}</p>
                          <p className="text-xs text-muted-foreground">{c.role}</p>
                        </div>
                        {c.linkedin_url && (
                          <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1 shrink-0">
                            <Linkedin className="h-3 w-3" /> LinkedIn
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {revealed.focus_areas && revealed.focus_areas.length > 0 && (
                <Section title="Focus areas" icon={Target}>
                  <div className="flex flex-wrap gap-1.5">
                    {revealed.focus_areas.map((f, i) => (
                      <span key={i} className="text-[11px] bg-card border border-border rounded-full px-2 py-0.5">{f}</span>
                    ))}
                  </div>
                </Section>
              )}

              {revealed.references && revealed.references.length > 0 && (
                <Section title="References" icon={ExternalLink}>
                  <div className="flex flex-wrap gap-1.5">
                    {revealed.references.map((r, i) => (
                      <RefChip key={i} r={r} />
                    ))}
                  </div>
                </Section>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setRevealed(null)}>Close</Button>
            <Link to="/app/leads">
              <Button className="bg-gradient-primary shadow-glow">
                Open in Leads <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-0.5">{label}</p>
      <div className="text-sm text-foreground/90">{children}</div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" /> {title}
      </p>
      {children}
    </div>
  );
}
