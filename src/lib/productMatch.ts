// Detect which of the workspace's own products/systems a lead already uses.
// We tokenize the company_profiles "products_summary" + "target_systems" into
// branded names, then look for case-insensitive matches against the lead's
// tools / systems_in_use arrays.

const STOPWORDS = new Set([
  "and","or","the","for","with","platform","software","tool","tools","system","systems",
  "service","services","product","products","solution","solutions","management","based",
  "app","apps","cloud","online","of","to","a","an","in","on","by","our","we","you","your",
  "is","are","that","this","it","as","at","be","from","via","using","use","uses","used",
]);

export function extractOwnedProducts(
  productsSummary?: string | null,
  targetSystems?: string[] | null,
): string[] {
  const out = new Set<string>();
  (targetSystems ?? []).forEach((s) => {
    const t = (s ?? "").trim();
    if (t) out.add(t);
  });
  if (productsSummary) {
    // Pull capitalized words / brand-like tokens (e.g. Salesforce, HubSpot, Outreach.io)
    const matches = productsSummary.match(/\b[A-Z][A-Za-z0-9.+\-]{2,}\b/g) ?? [];
    matches.forEach((m) => {
      if (!STOPWORDS.has(m.toLowerCase())) out.add(m);
    });
  }
  return [...out];
}

export function matchOwnedProducts(
  lead: { tools?: string[] | null; systems_in_use?: string[] | null },
  owned: string[],
): string[] {
  if (!owned.length) return [];
  const leadTokens = [...(lead.tools ?? []), ...(lead.systems_in_use ?? [])]
    .map((t) => (t ?? "").toLowerCase().trim())
    .filter(Boolean);
  if (!leadTokens.length) return [];
  const hits = new Set<string>();
  for (const p of owned) {
    const needle = p.toLowerCase();
    if (leadTokens.some((t) => t === needle || t.includes(needle) || needle.includes(t))) {
      hits.add(p);
    }
  }
  return [...hits];
}
