export function signalHireProviderCredits(value: unknown, header: string | null = null): number | null {
  const body = typeof value === 'object' && value !== null && 'credits' in value ? value.credits : null;
  for (const candidate of [body, header]) {
    if (typeof candidate !== 'number' && typeof candidate !== 'string') continue;
    if (typeof candidate === 'string' && !candidate.trim()) continue;
    const number = Number(candidate);
    if (Number.isSafeInteger(number) && number >= 0) return number;
  }
  return null;
}