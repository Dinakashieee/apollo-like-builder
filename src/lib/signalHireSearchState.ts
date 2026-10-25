export function savedSearchOutcome(row: { status?: string; results?: unknown; error?: string | null }) {
  if (row.status === 'completed' && Array.isArray(row.results)) {
    return { status: 'completed' as const, results: row.results, error: null };
  }
  if (row.status === 'failed') {
    return { status: 'failed' as const, results: [], error: row.error || 'SignalHire search failed.' };
  }
  return null;
}