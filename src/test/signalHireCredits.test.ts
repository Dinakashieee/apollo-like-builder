import { describe, expect, it } from 'vitest';
import { signalHireProviderCredits } from '../../supabase/functions/_shared/signalhire-credits';

describe('SignalHire provider credit balance', () => {
  it('reads documented account credits without using a workspace wallet', () => {
    expect(signalHireProviderCredits({ credits: 27 })).toBe(27);
    expect(signalHireProviderCredits({ credits: 0 })).toBe(0);
  });
  it('uses the provider credit header when needed', () => {
    expect(signalHireProviderCredits(null, '42')).toBe(42);
  });
  it('does not turn unavailable or invalid balances into zero', () => {
    for (const value of [null, {}, { credits: '' }, { credits: -1 }, { credits: 1.5 }]) {
      expect(signalHireProviderCredits(value)).toBeNull();
    }
  });
});