export const leadStatuses = ['new', 'contacted', 'qualified', 'won', 'lost'] as const;
export type DailyLeadStatus = typeof leadStatuses[number];
export function explicitStatus(message: string, status: DailyLeadStatus) {
  const patterns = { new: /\b(?:back to new|mark.{0,30}new|set.{0,30}new)\b/i, contacted: /\b(?:contacted|called|emailed)\b/i, qualified: /\bqualified\b/i, won: /\b(?:closed won|won|deal signed)\b/i, lost: /\b(?:closed lost|lost|not interested)\b/i };
  return patterns[status].test(message);
}
export function matchDailyLead<T extends { id: string; company_name: string; contact_name: string | null }>(leads: T[], company: string, contact?: string | null) {
  const normalize = (text: string) => text.trim().replace(/\s+/g, ' ').toLowerCase();
  return leads.filter((lead) => normalize(lead.company_name) === normalize(company) && (!contact || normalize(lead.contact_name ?? '') === normalize(contact)));
}