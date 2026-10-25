// Feature access is separate from real subscription status and metered usage.
export const TEMPORARY_FEATURE_ACCESS = true;

export function featureLimits<T extends { leads: number; seats: number; ai_emails: number }>(
  limits: T,
  signedIn: boolean,
): T {
  return TEMPORARY_FEATURE_ACCESS && signedIn
    ? { ...limits, leads: Infinity, seats: Infinity }
    : limits;
}

export function hasPaidFeatureAccess(signedIn: boolean, paid: boolean): boolean {
  return signedIn && (TEMPORARY_FEATURE_ACCESS || paid);
}