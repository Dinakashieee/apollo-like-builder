import { describe, expect, it } from 'vitest';
import { featureLimits, hasPaidFeatureAccess } from '@/lib/featureAccess';
import { PLAN_LIMITS } from '@/hooks/useEntitlements';

describe('temporary feature access', () => {
  it('unlocks paid features for signed-in free users', () => {
    expect(hasPaidFeatureAccess(true, false)).toBe(true);
    expect(featureLimits(PLAN_LIMITS.free, true).leads).toBe(Infinity);
    expect(featureLimits(PLAN_LIMITS.free, true).seats).toBe(Infinity);
  });
  it('does not grant access to signed-out users', () => {
    expect(hasPaidFeatureAccess(false, false)).toBe(false);
    expect(featureLimits(PLAN_LIMITS.free, false).leads).toBe(10);
  });
  it('preserves AI usage allowances for each existing plan', () => {
    expect(featureLimits(PLAN_LIMITS.free, true).ai_emails).toBe(25);
    expect(featureLimits(PLAN_LIMITS.starter, true).ai_emails).toBe(2500);
    expect(featureLimits(PLAN_LIMITS.growth, true).ai_emails).toBe(10000);
    expect(featureLimits(PLAN_LIMITS.scale, true).ai_emails).toBe(25000);
  });
});