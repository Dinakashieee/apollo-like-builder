export interface CheckedSource {
  title: string;
  url: string;
  snippet: string;
  type: 'pdf' | 'linkedin' | 'web';
  publication_year: number | null;
  checked_at: string;
  verification: 'page_checked' | 'search_only';
}

export function publicResearchUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password &&
      !u.port && !u.hostname.includes(':') && !/^\d/.test(u.hostname) &&
      u.hostname.includes('.') && !/(^|\.)(localhost|local|internal|test|invalid)$/.test(u.hostname);
  } catch { return false; }
}

export function publicationYear(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const match = /^(19\d{2}|20\d{2})(?:-\d{2}-\d{2}|\/\d{2}\/\d{2}|$)/.exec(value);
  const year = match ? Number(match[1]) : null;
  return year !== null && year <= new Date().getFullYear() ? year : null;
}

const normal = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
export function supportedQuote(source: CheckedSource | undefined, quote: string, company: string): boolean {
  return !!source && source.verification === 'page_checked' && quote.trim().length >= 20 &&
    normal(source.snippet).includes(normal(quote)) && normal(source.snippet).includes(normal(company));
}

export async function checkResearchSources<T extends { title: string; url: string; snippet: string; type: CheckedSource['type'] }>(sources: T[], key: string): Promise<(T & CheckedSource)[]> {
  const results: (T & CheckedSource)[] = [];
  // Bounded concurrency; inaccessible LinkedIn pages remain explicitly unverified.
  for (let i = 0; i < sources.length; i += 6) {
    results.push(...await Promise.all(sources.slice(i, i + 6).map(async (source) => {
      const base = { ...source, publication_year: null as number | null, checked_at: new Date().toISOString(), verification: 'search_only' as CheckedSource['verification'] };
      if (!publicResearchUrl(source.url)) return base;
      try {
        const response = await fetch('https://api.firecrawl.dev/v2/scrape', {
          method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: source.url, formats: ['markdown'], onlyMainContent: true }), signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) return base;
        const payload = await response.json();
        const data = payload.data ?? payload;
        if (!data.markdown || data.metadata?.statusCode >= 400) return base;
        const metadata = data.metadata ?? {};
        return { ...base, snippet: String(data.markdown).slice(0, 14000), verification: 'page_checked' as const,
          publication_year: publicationYear(metadata.publishedTime ?? metadata['article:published_time'] ?? metadata.datePublished ?? metadata.date) };
      } catch { return base; }
    })));
  }
  return results;
}

export function evidenceReferences(refs: { url: string }[], sources: CheckedSource[]) {
  return refs.flatMap((ref) => {
    const source = sources.find((s) => s.url === ref.url && publicResearchUrl(s.url));
    return source ? [{ label: source.title, url: source.url, type: source.type, publication_year: source.publication_year, checked_at: source.checked_at, verification: source.verification }] : [];
  });
}