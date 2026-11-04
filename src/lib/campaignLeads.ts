export type TeamRole = "admin" | "marketing" | "sales";
export type AdPlatform = "linkedin" | "facebook" | "tiktok" | "google" | "other";
export const AD_PLATFORMS: { key: AdPlatform; label: string }[] = [
  { key: "linkedin", label: "LinkedIn" },
  { key: "facebook", label: "Facebook" },
  { key: "tiktok", label: "TikTok" },
  { key: "google", label: "Google Search" },
  { key: "other", label: "Other" },
];
export const LEAD_STATUSES = ["new", "contacted", "qualified", "won", "lost"] as const;

/** Admin and Marketing edit and assign campaign leads; Sales only views leads assigned to them. */
export const canManageLeads = (role: TeamRole | null | undefined) => role === "admin" || role === "marketing";
export const canManageRoles = (role: TeamRole | null | undefined) => role === "admin";

export function normalizePlatform(v: string | undefined | null): AdPlatform {
  const s = (v ?? "").toLowerCase().trim();
  if (s.includes("linkedin")) return "linkedin";
  if (s.includes("facebook") || s.includes("meta") || s.includes("instagram")) return "facebook";
  if (s.includes("tiktok")) return "tiktok";
  if (s.includes("google")) return "google";
  return "other";
}

export interface CsvLead { full_name?: string; email?: string; phone?: string; company?: string; message?: string; campaign: string; platform: AdPlatform }

function splitCsvLine(line: string): string[] {
  const out: string[] = []; let cur = ""; let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true; else if (c === ",") { out.push(cur); cur = ""; } else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

export function parseLeadCsv(text: string, fallbackCampaign = "Imported leads"): CsvLead[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const head = splitCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/[\s-]+/g, "_"));
  const col = (...names: string[]) => head.findIndex((h) => names.includes(h));
  const idx = { name: col("name", "full_name"), first: col("first_name"), last: col("last_name"), email: col("email", "email_address"), phone: col("phone", "phone_number", "mobile"), company: col("company", "company_name"), message: col("message", "notes"), campaign: col("campaign", "campaign_name"), platform: col("platform", "source") };
  const get = (r: string[], i: number) => (i >= 0 && r[i] ? r[i].slice(0, 400) : undefined);
  return lines.slice(1).map((l) => {
    const r = splitCsvLine(l);
    const full_name = get(r, idx.name) ?? ([get(r, idx.first), get(r, idx.last)].filter(Boolean).join(" ") || undefined);
    return { full_name, email: get(r, idx.email), phone: get(r, idx.phone), company: get(r, idx.company), message: get(r, idx.message), campaign: get(r, idx.campaign) ?? fallbackCampaign, platform: normalizePlatform(get(r, idx.platform)) };
  }).filter((x) => x.full_name || x.email || x.phone);
}

export function leadsPerCampaign(campaigns: { id: string; name: string; platform: AdPlatform }[], leads: { campaign_id: string; status: string }[]) {
  return campaigns.map((c) => {
    const mine = leads.filter((l) => l.campaign_id === c.id);
    return { id: c.id, name: c.name, platform: c.platform, leads: mine.length, won: mine.filter((l) => l.status === "won").length };
  }).sort((a, b) => b.leads - a.leads);
}
