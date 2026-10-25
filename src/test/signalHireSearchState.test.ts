import { describe, expect, it } from 'vitest';
import { savedSearchOutcome } from '@/lib/signalHireSearchState';

describe('SignalHire saved search recovery', () => {
  it('ends waiting when the provider completes with zero matches', () => {
    expect(savedSearchOutcome({ status: 'completed', results: [] })).toEqual({ status: 'completed', results: [], error: null });
  });
  it('recovers returned profiles without a realtime notification', () => {
    expect(savedSearchOutcome({ status: 'completed', results: [{ id: 'provider-1' }] })?.results).toEqual([{ id: 'provider-1' }]);
  });
  it('ends waiting on a saved provider failure', () => {
    expect(savedSearchOutcome({ status: 'failed', error: 'Provider unavailable' })?.error).toBe('Provider unavailable');
  });
  it('does not treat unfinished work as an empty result', () => {
    expect(savedSearchOutcome({ status: 'pending', results: [] })).toBeNull();
  });
});