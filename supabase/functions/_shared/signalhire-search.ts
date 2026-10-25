export interface SignalHireFilters {
  name?: string;
  job_title?: string;
  location?: string;
  company?: string;
  industry?: string;
}

// Search API filters are top-level fields; items/callbackUrl belong to Person API.
export function signalHireSearchPayload(filters: SignalHireFilters, size: number) {
  const fields = {
    fullName: filters.name?.trim(),
    currentTitle: filters.job_title?.trim(),
    location: filters.location?.trim(),
    currentCompany: filters.company?.trim(),
    industry: filters.industry?.trim(),
  };
  const query = Object.fromEntries(Object.entries(fields).filter(([, value]) => !!value));
  if (!Object.keys(query).length) throw new Error('Enter at least one search filter.');
  return { ...query, size };
}

export function normalizeSearchProfiles(profiles: unknown[]) {
  return profiles.filter((p): p is Record<string, any> => !!p && typeof p === 'object').map((p, i) => {
    const experience = p.experience?.[0] ?? p.currentExperience ?? {};
    return {
      id: String(p.uid ?? p.id ?? i),
      name: p.fullName ?? p.name ?? [p.firstName, p.lastName].filter(Boolean).join(' ') ?? 'Unknown',
      company: p.currentCompany ?? experience.company ?? p.company ?? '',
      role: p.currentTitle ?? experience.position ?? p.title ?? p.headline ?? '',
      email: '', // Search previews do not reveal contact details.
      linkedin: p.linkedin ?? p.linkedinUrl ?? p.social?.find?.((s: any) => s.type === 'li')?.link ?? null,
    };
  });
}