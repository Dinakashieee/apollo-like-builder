import { useEffect, useMemo, useState } from "react";
import {
  ShieldCheck,
  Mail,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Coffee,
  Gauge,
  Plus,
  Minus,
  RotateCcw,
  Sparkles,
  Clock,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type CheckStatus = "pass" | "warn" | "fail";
type Check = {
  key: "mx" | "spf" | "dkim" | "dmarc";
  label: string;
  description: string;
  status: CheckStatus;
  detail: string;
};

const DOH = "https://dns.google/resolve";

async function dnsQuery(name: string, type: string): Promise<string[]> {
  try {
    const res = await fetch(`${DOH}?name=${encodeURIComponent(name)}&type=${type}`);
    if (!res.ok) return [];
    const json = await res.json();
    if (!json.Answer) return [];
    return json.Answer.map((a: { data: string }) => a.data.replace(/^"|"$/g, ""));
  } catch {
    return [];
  }
}

async function runDomainCheck(domain: string): Promise<Check[]> {
  const cleaned = domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^@/, "");

  const [mx, txt, dmarc, dkimDefault] = await Promise.all([
    dnsQuery(cleaned, "MX"),
    dnsQuery(cleaned, "TXT"),
    dnsQuery(`_dmarc.${cleaned}`, "TXT"),
    dnsQuery(`default._domainkey.${cleaned}`, "TXT"),
  ]);

  const spfRecord = txt.find((r) => r.toLowerCase().startsWith("v=spf1"));
  const dmarcRecord = dmarc.find((r) => r.toLowerCase().startsWith("v=dmarc1"));
  const dkimRecord = dkimDefault.find((r) => r.toLowerCase().includes("v=dkim1") || r.toLowerCase().includes("p="));

  const dmarcPolicy = dmarcRecord?.match(/p=(\w+)/i)?.[1]?.toLowerCase();

  return [
    {
      key: "mx",
      label: "MX records",
      description: "Mail servers that accept email for your domain",
      status: mx.length > 0 ? "pass" : "fail",
      detail: mx.length > 0 ? `${mx.length} MX record(s) found` : "No MX records — domain cannot receive mail",
    },
    {
      key: "spf",
      label: "SPF",
      description: "Lists which servers are allowed to send on your behalf",
      status: spfRecord ? "pass" : "fail",
      detail: spfRecord ? spfRecord.slice(0, 90) + (spfRecord.length > 90 ? "…" : "") : "No SPF record — spoofing risk and lower inbox rate",
    },
    {
      key: "dkim",
      label: "DKIM",
      description: "Cryptographic signature that proves email authenticity",
      status: dkimRecord ? "pass" : "warn",
      detail: dkimRecord
        ? "DKIM key found on default selector"
        : "No DKIM on the 'default' selector. Your ESP may use a different selector — check your sending tool.",
    },
    {
      key: "dmarc",
      label: "DMARC",
      description: "Tells inboxes how to handle unauthenticated mail from you",
      status: !dmarcRecord ? "fail" : dmarcPolicy === "none" ? "warn" : "pass",
      detail: !dmarcRecord
        ? "No DMARC policy published"
        : `Policy: p=${dmarcPolicy}${dmarcPolicy === "none" ? " (monitor-only — upgrade to quarantine/reject)" : ""}`,
    },
  ];
}

function scoreOf(checks: Check[]) {
  if (checks.length === 0) return 0;
  const w = { pass: 100, warn: 60, fail: 0 } as const;
  return Math.round(checks.reduce((s, c) => s + w[c.status], 0) / checks.length);
}

// --- Send pace coach ---
const PACE_KEY = "email_pace_v1";
type PaceState = { date: string; sent: number; lastSendAt: number | null; pausedUntil: number | null };

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function loadPace(): PaceState {
  try {
    const raw = localStorage.getItem(PACE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as PaceState;
      if (p.date === todayStr()) return p;
    }
  } catch {}
  return { date: todayStr(), sent: 0, lastSendAt: null, pausedUntil: null };
}

function savePace(p: PaceState) {
  localStorage.setItem(PACE_KEY, JSON.stringify(p));
}

const DAILY_LIMIT = 200;
const BURST_LIMIT = 25;
const BURST_WINDOW_MIN = 15;
const BREAK_MIN = 10;

function paceAdvice(p: PaceState): { tone: "good" | "warn" | "bad"; title: string; body: string } {
  const now = Date.now();
  if (p.pausedUntil && p.pausedUntil > now) {
    const min = Math.ceil((p.pausedUntil - now) / 60000);
    return { tone: "warn", title: `Take a ${min}-minute break`, body: "You're on a cool-down. Inboxes love consistent, human-paced sending." };
  }
  if (p.sent >= DAILY_LIMIT) {
    return { tone: "bad", title: "Daily cap reached", body: `You've sent ${p.sent} emails today. Stop here — anything more puts your domain reputation at risk.` };
  }
  if (p.sent >= BURST_LIMIT && p.lastSendAt && now - p.lastSendAt < BURST_WINDOW_MIN * 60_000) {
    return { tone: "warn", title: "Slow down", body: `You sent a burst recently. Take ${BREAK_MIN} minutes off to stay below spam triggers.` };
  }
  if (p.sent >= DAILY_LIMIT * 0.75) {
    return { tone: "warn", title: "Approaching daily cap", body: `Only ${DAILY_LIMIT - p.sent} sends left today. Pace the rest.` };
  }
  return { tone: "good", title: "You're pacing well", body: "Keep batches small and spread sends across the day for the best inbox rate." };
}

export default function EmailHealth() {
  const [domain, setDomain] = useState("");
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [pace, setPace] = useState<PaceState>(() => loadPace());
  const [, force] = useState(0);

  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    savePace(pace);
  }, [pace]);

  const score = checks ? scoreOf(checks) : null;
  const advice = useMemo(() => paceAdvice(pace), [pace]);

  const handleCheck = async () => {
    if (!domain.trim()) {
      toast({ title: "Enter a domain", description: "Try yourcompany.com", variant: "destructive" });
      return;
    }
    setLoading(true);
    setChecks(null);
    try {
      const result = await runDomainCheck(domain);
      setChecks(result);
      const s = scoreOf(result);
      toast({
        title: `Health score: ${s}/100`,
        description: s >= 80 ? "Looking great." : s >= 50 ? "A few fixes will help deliverability." : "Critical issues found — fix these soon.",
      });
    } finally {
      setLoading(false);
    }
  };

  const recordSend = (n: number) => {
    setPace((p) => ({ ...p, sent: Math.max(0, p.sent + n), lastSendAt: Date.now() }));
  };

  const startBreak = () => {
    setPace((p) => ({ ...p, pausedUntil: Date.now() + BREAK_MIN * 60_000 }));
    toast({ title: `Break started`, description: `We'll nudge you in ${BREAK_MIN} minutes.` });
  };

  const resetDay = () => {
    setPace({ date: todayStr(), sent: 0, lastSendAt: null, pausedUntil: null });
    toast({ title: "Counter reset" });
  };

  const dailyPct = Math.min(100, (pace.sent / DAILY_LIMIT) * 100);

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-sm text-muted-foreground font-medium mb-1 flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Free for every workspace
          </p>
          <h1 className="text-3xl lg:text-4xl font-display font-bold text-primary-deep">
            Email Health
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
            Check your company's email setup and pace your sends. Better deliverability, fewer spam folders, no extra cost.
          </p>
        </div>
        <Badge variant="secondary" className="bg-success/10 text-success border-success/20 gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5" /> Always free
        </Badge>
      </div>

      <div className="grid lg:grid-cols-[1.3fr_1fr] gap-6">
        {/* Domain health */}
        <div className="card-elevated p-6 space-y-5">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 grid place-items-center shrink-0">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold">Company domain health</h2>
              <p className="text-xs text-muted-foreground">
                We check MX, SPF, DKIM and DMARC live via public DNS. Nothing is stored.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCheck()}
                placeholder="yourcompany.com"
                className="pl-9"
              />
            </div>
            <Button onClick={handleCheck} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {loading ? "Checking" : "Run check"}
            </Button>
          </div>

          {score !== null && (
            <div className="rounded-xl border border-border bg-muted/30 p-4 flex items-center gap-4">
              <div
                className={cn(
                  "h-16 w-16 rounded-full grid place-items-center text-lg font-bold border-4",
                  score >= 80
                    ? "border-success/40 bg-success/10 text-success"
                    : score >= 50
                    ? "border-warning/40 bg-warning/10 text-warning"
                    : "border-destructive/40 bg-destructive/10 text-destructive"
                )}
              >
                {score}
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {score >= 80 ? "Strong setup" : score >= 50 ? "Needs attention" : "Critical issues"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Score is calculated from MX, SPF, DKIM and DMARC.
                </p>
              </div>
            </div>
          )}

          {checks && (
            <div className="space-y-2.5">
              {checks.map((c) => {
                const Icon = c.status === "pass" ? CheckCircle2 : c.status === "warn" ? AlertTriangle : XCircle;
                const color =
                  c.status === "pass"
                    ? "text-success bg-success/10 border-success/20"
                    : c.status === "warn"
                    ? "text-warning bg-warning/10 border-warning/20"
                    : "text-destructive bg-destructive/10 border-destructive/20";
                return (
                  <div key={c.key} className="rounded-lg border border-border p-3 flex items-start gap-3">
                    <div className={cn("h-8 w-8 rounded-lg grid place-items-center shrink-0 border", color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold">{c.label}</p>
                        <Badge variant="outline" className={cn("text-[10px] uppercase tracking-wider border-0", color)}>
                          {c.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>
                      <p className="text-xs text-foreground/80 mt-1 break-all font-mono">{c.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!checks && !loading && (
            <div className="rounded-xl border border-dashed border-border p-6 text-center">
              <Mail className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Enter your domain to scan its email reputation.</p>
            </div>
          )}
        </div>

        {/* Send pace coach */}
        <div className="card-elevated p-6 space-y-5">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 grid place-items-center shrink-0">
              <Gauge className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold">Send pace coach</h2>
              <p className="text-xs text-muted-foreground">
                Healthy sending means breaks. We help you stay under spam-trigger limits.
              </p>
            </div>
          </div>

          <div
            className={cn(
              "rounded-xl p-4 border",
              advice.tone === "good"
                ? "bg-success/5 border-success/20"
                : advice.tone === "warn"
                ? "bg-warning/5 border-warning/20"
                : "bg-destructive/5 border-destructive/20"
            )}
          >
            <div className="flex items-start gap-2.5">
              {advice.tone === "good" ? (
                <TrendingUp className="h-4 w-4 text-success mt-0.5 shrink-0" />
              ) : advice.tone === "warn" ? (
                <Coffee className="h-4 w-4 text-warning mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold">{advice.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{advice.body}</p>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-muted-foreground font-medium">Today's sends</span>
              <span className="font-semibold">
                {pace.sent} / {DAILY_LIMIT}
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all",
                  dailyPct >= 100 ? "bg-destructive" : dailyPct >= 75 ? "bg-warning" : "bg-primary"
                )}
                style={{ width: `${dailyPct}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => recordSend(1)}>
              <Plus className="h-3.5 w-3.5" /> Logged a send
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => recordSend(10)}>
              <Plus className="h-3.5 w-3.5" /> +10 batch
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={startBreak}>
              <Coffee className="h-3.5 w-3.5" /> Take a break
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={resetDay}>
              <RotateCcw className="h-3.5 w-3.5" /> Reset day
            </Button>
          </div>

          <div className="rounded-lg bg-muted/40 border border-border/60 p-3 space-y-1.5 text-xs">
            <p className="font-semibold flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary" /> Why this matters
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Inbox providers watch volume and rhythm. Sending {BURST_LIMIT}+ emails in {BURST_WINDOW_MIN} minutes — or more
              than {DAILY_LIMIT} in a day — from a fresh domain is the fastest way into spam. Short breaks protect your
              reputation and your reply rate.
            </p>
          </div>

          {pace.sent > 0 && (
            <button
              onClick={() => recordSend(-1)}
              className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <Minus className="h-3 w-3" /> Undo last send
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
