// Scores outbound messages against the five reasons buyers ghost (Hunter, State of Email Outreach 2026).
export type GhostFactor = "pushy" | "generic" | "irrelevant" | "lowValue" | "noReply";

export const GHOST_FACTORS: { key: GhostFactor; label: string; benchmark: number; tip: string }[] = [
  { key: "pushy", label: "Too pushy or salesy", benchmark: 65, tip: "Drop urgency words and hard asks; offer one soft, low-effort next step." },
  { key: "generic", label: "Generic and impersonal", benchmark: 48, tip: "Use the contact's name and company and reference something specific about them." },
  { key: "irrelevant", label: "Not relevant to them", benchmark: 61, tip: "Mention their industry, systems or a pain point you know they have." },
  { key: "lowValue", label: "No real value", benchmark: 28, tip: "Share an insight, number or useful idea instead of 'just checking in'." },
  { key: "noReply", label: "No replies received", benchmark: 33, tip: "Change the angle or channel after two unanswered messages." },
];

export interface GhostLead {
  id: string;
  company_name: string;
  contact_name?: string | null;
  industry?: string | null;
  pain_points?: string[] | null;
  systems_in_use?: string[] | null;
  tools?: string[] | null;
}
export interface GhostMessage {
  lead_id: string | null;
  channel: "email" | "whatsapp";
  text: string;
}
export type FactorScores = Record<GhostFactor, number>;

const PUSHY = [/\bact now\b/, /\blimited time\b/, /\blast chance\b/, /\bbuy now\b/, /\bdiscount\b/, /\bguarantee/, /\burgent/, /\bdon'?t miss\b/, /\bspecial offer\b/, /\bfree trial\b/, /\bexclusive\b/, /\bbook a (call|demo|meeting)\b/, /\bsign up\b/, /\basap\b/, /\btoday only\b/, /\bbest (price|deal)\b/];
const GENERIC = [/\bdear sir\b/, /\bdear madam\b/, /\bto whom it may concern\b/, /\bhope this (email|message) finds you\b/, /\bdear customer\b/, /\bhi there\b/, /\bvaluable time\b/, /\bleading provider\b/];
const LOW_VALUE = [/\bjust checking in\b/, /\btouching base\b/, /\bjust following up\b/, /\bfollowing up on my (last|previous)\b/, /\bany update\b/, /\bcircling back\b/, /\bbumping this\b/];
const VALUE = [/\d+\s?%/, /\bcase study\b/, /\bfor example\b/, /\bwe (found|noticed|saw)\b/, /\binsight\b/, /\?/, /\bbenchmark\b/, /\bresult/];

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const hits = (t: string, list: RegExp[]) => list.reduce((n, r) => n + (r.test(t) ? 1 : 0), 0);

export function scoreMessage(text: string, lead?: GhostLead | null): Omit<FactorScores, "noReply"> {
  const t = (text || "").toLowerCase();
  const exclaim = (t.match(/!/g) || []).length;
  const pushy = clamp(hits(t, PUSHY) * 25 + Math.min(exclaim, 4) * 10);

  let generic = hits(t, GENERIC) * 30;
  const first = lead?.contact_name?.trim().split(/\s+/)[0]?.toLowerCase();
  const company = lead?.company_name?.trim().toLowerCase();
  if (!first || !t.includes(first)) generic += 35;
  if (!company || !t.includes(company)) generic += 35;

  const context = [lead?.industry, ...(lead?.pain_points ?? []), ...(lead?.systems_in_use ?? []), ...(lead?.tools ?? [])]
    .filter((x): x is string => !!x && x.trim().length > 2)
    .map((x) => x.toLowerCase());
  const matched = context.filter((c) => t.includes(c)).length;
  const irrelevant = context.length === 0 ? 70 : matched === 0 ? 90 : matched === 1 ? 45 : 15;

  const words = t.split(/\s+/).filter(Boolean).length;
  let lowValue = hits(t, LOW_VALUE) * 35 + (words < 30 ? 30 : 0) - hits(t, VALUE) * 15 + 30;
  return { pushy, generic: clamp(generic), irrelevant, lowValue: clamp(lowValue) };
}

export interface AccountGhostReport {
  key: string;
  company: string;
  sent: number;
  replies: number;
  scores: FactorScores;
  overall: number;
  topReason: GhostFactor | null;
}

export function noReplyScore(sent: number, replies: number): number {
  if (sent === 0) return 0;
  if (replies > 0) return clamp(30 - replies * 10);
  return clamp(40 + sent * 20);
}

function finish(key: string, company: string, msgScores: Omit<FactorScores, "noReply">[], sent: number, replies: number): AccountGhostReport {
  const avg = (k: keyof Omit<FactorScores, "noReply">) => (msgScores.length ? clamp(msgScores.reduce((s, m) => s + m[k], 0) / msgScores.length) : 0);
  const scores: FactorScores = { pushy: avg("pushy"), generic: avg("generic"), irrelevant: avg("irrelevant"), lowValue: avg("lowValue"), noReply: noReplyScore(sent, replies) };
  const overall = sent ? clamp(Object.values(scores).reduce((a, b) => a + b, 0) / 5) : 0;
  const top = sent ? (Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0] as GhostFactor) : null;
  return { key, company, sent, replies, scores, overall, topReason: top };
}

export function analyzeGhosting(leads: GhostLead[], messages: GhostMessage[], repliesByLead: Record<string, number>) {
  const byId = new Map(leads.map((l) => [l.id, l]));
  const groups = new Map<string, { company: string; scores: Omit<FactorScores, "noReply">[]; sent: number; replies: number; leadIds: Set<string> }>();
  for (const m of messages) {
    const lead = m.lead_id ? byId.get(m.lead_id) : undefined;
    const company = lead?.company_name?.trim() || "Unlinked contacts";
    const key = company.toLowerCase();
    const g = groups.get(key) ?? { company, scores: [], sent: 0, replies: 0, leadIds: new Set() };
    g.scores.push(scoreMessage(m.text, lead));
    g.sent += 1;
    if (lead && !g.leadIds.has(lead.id)) {
      g.leadIds.add(lead.id);
      g.replies += repliesByLead[lead.id] ?? 0;
    }
    groups.set(key, g);
  }
  const accounts = [...groups.entries()].map(([k, g]) => finish(k, g.company, g.scores, g.sent, g.replies)).sort((a, b) => b.overall - a.overall);
  const all = [...groups.values()];
  const overall = finish("all", "All outreach", all.flatMap((g) => g.scores), messages.length, all.reduce((s, g) => s + g.replies, 0));
  return { overall, accounts };
}
