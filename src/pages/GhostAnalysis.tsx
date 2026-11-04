import { useEffect, useMemo, useState } from "react";
import { Loader2, Ghost, MessageCircle, Mail } from "lucide-react";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { analyzeGhosting, GHOST_FACTORS, type AccountGhostReport, type GhostLead, type GhostMessage } from "@/lib/ghostAnalysis";

const riskTone = (n: number) => (n >= 60 ? "text-destructive" : n >= 35 ? "text-amber-600" : "text-primary");
const riskLabel = (n: number) => (n >= 60 ? "High risk" : n >= 35 ? "Medium risk" : "Healthy");

function GhostRadar({ report }: { report: AccountGhostReport }) {
  const data = GHOST_FACTORS.map((f) => ({ factor: f.label, you: report.scores[f.key], buyers: f.benchmark }));
  return (
    <ResponsiveContainer width="100%" height={320}>
      <RadarChart data={data} outerRadius="70%">
        <PolarGrid stroke="hsl(var(--border))" />
        <PolarAngleAxis dataKey="factor" tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }} />
        <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
        <Radar name="Buyers who say so (Hunter 2026)" dataKey="buyers" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted-foreground))" fillOpacity={0.12} />
        <Radar name="Your ghost risk" dataKey="you" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.3} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

function Points({ report }: { report: AccountGhostReport }) {
  const items = GHOST_FACTORS.map((f) => ({ ...f, score: report.scores[f.key] })).sort((a, b) => b.score - a.score);
  return (
    <ul className="space-y-2">
      {items.map((f) => (
        <li key={f.key} className="flex gap-3 text-sm">
          <span className={cn("w-12 shrink-0 font-semibold tabular-nums", riskTone(f.score))}>{f.score}</span>
          <span>
            <span className="font-medium">{f.label}.</span> <span className="text-muted-foreground">{f.score >= 35 ? f.tip : "Looking good here."}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function GhostAnalysis() {
  const { current } = useWorkspace();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<GhostLead[]>([]);
  const [messages, setMessages] = useState<GhostMessage[]>([]);
  const [replies, setReplies] = useState<Record<string, number>>({});
  const [counts, setCounts] = useState({ email: 0, whatsapp: 0 });
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!current) return;
    let alive = true;
    (async () => {
      setLoading(true);
      const ws = current.id;
      const [l, em, sc, wa, th] = await Promise.all([
        supabase.from("leads").select("id, company_name, contact_name, industry, pain_points, systems_in_use, tools, reply_count").eq("workspace_id", ws).limit(2000),
        supabase.from("email_messages").select("thread_id, body_text, snippet").eq("workspace_id", ws).eq("direction", "outbound").order("sent_at", { ascending: false }).limit(1000),
        supabase.from("scheduled_emails").select("lead_id, body").eq("workspace_id", ws).eq("status", "sent").order("sent_at", { ascending: false }).limit(1000),
        supabase.from("whatsapp_messages").select("lead_id, body, direction").eq("workspace_id", ws).order("sent_at", { ascending: false }).limit(2000),
        supabase.from("email_threads").select("id, lead_id").eq("workspace_id", ws).limit(2000),
      ]);
      if (!alive) return;
      const threadLead = new Map((th.data ?? []).map((t) => [t.id, t.lead_id]));
      const rep: Record<string, number> = {};
      for (const x of l.data ?? []) rep[x.id] = x.reply_count ?? 0;
      for (const w of wa.data ?? []) if (w.direction === "inbound" && w.lead_id) rep[w.lead_id] = (rep[w.lead_id] ?? 0) + 1;
      const emails: GhostMessage[] = [
        ...(em.data ?? []).map((m) => ({ lead_id: threadLead.get(m.thread_id) ?? null, channel: "email" as const, text: m.body_text || m.snippet || "" })),
        ...(sc.data ?? []).map((m) => ({ lead_id: m.lead_id, channel: "email" as const, text: m.body })),
      ];
      const was: GhostMessage[] = (wa.data ?? []).filter((w) => w.direction !== "inbound").map((w) => ({ lead_id: w.lead_id, channel: "whatsapp" as const, text: w.body }));
      setLeads((l.data ?? []) as GhostLead[]);
      setMessages([...emails, ...was]);
      setReplies(rep);
      setCounts({ email: emails.length, whatsapp: was.length });
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [current?.id]);

  const result = useMemo(() => analyzeGhosting(leads, messages, replies), [leads, messages, replies]);
  const active = (selected && result.accounts.find((a) => a.key === selected)) || result.overall;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Ghost className="h-6 w-6" /> Why buyers ghost you</h1>
        <p className="text-sm text-muted-foreground">
          We screen your sent emails and WhatsApp messages against the five reasons decision-makers give for ignoring outreach (Hunter, State of Email Outreach 2026). Higher score = higher ghost risk.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : messages.length === 0 ? (
        <div className="rounded-lg border p-10 text-center text-muted-foreground">No sent emails or WhatsApp messages yet. Send some outreach and your ghost report appears here.</div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            {[
              { label: "Ghost risk score", value: `${result.overall.overall}/100`, tone: riskTone(result.overall.overall) },
              { label: "Emails screened", value: counts.email, icon: Mail },
              { label: "WhatsApp screened", value: counts.whatsapp, icon: MessageCircle },
              { label: "Accounts", value: result.accounts.length },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border bg-card p-4">
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className={cn("text-2xl font-bold", s.tone)}>{s.value}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border bg-card p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-semibold">{active.company}</h2>
                <Badge variant="outline" className={riskTone(active.overall)}>{riskLabel(active.overall)} · {active.overall}</Badge>
              </div>
              <GhostRadar report={active} />
            </div>
            <div className="rounded-lg border bg-card p-4">
              <h2 className="mb-1 font-semibold">Summary points</h2>
              <p className="mb-3 text-xs text-muted-foreground">{active.sent} messages sent · {active.replies} replies</p>
              <Points report={active} />
            </div>
          </div>

          <div className="rounded-lg border bg-card">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="font-semibold">By account</h2>
              {selected && <button className="text-sm text-primary underline" onClick={() => setSelected(null)}>Show all outreach</button>}
            </div>
            <div className="divide-y">
              {result.accounts.map((a) => (
                <button key={a.key} onClick={() => setSelected(a.key)} className={cn("flex w-full items-center gap-4 p-3 text-left text-sm hover:bg-muted/50", selected === a.key && "bg-muted")}>
                  <span className="flex-1 font-medium">{a.company}</span>
                  <span className="hidden text-muted-foreground sm:inline">{a.sent} sent · {a.replies} replies</span>
                  <span className="hidden text-muted-foreground md:inline">{a.topReason && GHOST_FACTORS.find((f) => f.key === a.topReason)?.label}</span>
                  <span className={cn("w-10 text-right font-semibold", riskTone(a.overall))}>{a.overall}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
