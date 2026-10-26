import { describe, expect, it } from 'vitest';
import { explicitStatus, matchDailyLead } from '../../supabase/functions/_shared/daily-update-intent';
describe('automatic daily lead changes', () => {
  const leads = [{ id: '1', company_name: 'CCL Design', contact_name: 'Anne' }, { id: '2', company_name: 'CCL Design', contact_name: 'Ben' }, { id: '3', company_name: 'CCL Design Group', contact_name: null }];
  it('maps closed lost only when a loss is explicitly stated', () => {
    expect(explicitStatus('CCL Design is closed lost', 'lost')).toBe(true);
    expect(explicitStatus('Completed a meeting with CCL Design', 'lost')).toBe(false);
  });
  it('does not choose between multiple people at the same company', () => {
    expect(matchDailyLead(leads, 'CCL Design').map((l) => l.id)).toEqual(['1', '2']);
  });
  it('requires an exact company match and honors the contact', () => {
    expect(matchDailyLead(leads, 'ccl design', 'Anne').map((l) => l.id)).toEqual(['1']);
    expect(matchDailyLead(leads, 'CCL')).toEqual([]);
  });
});