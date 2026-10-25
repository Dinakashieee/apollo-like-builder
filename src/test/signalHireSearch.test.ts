import { describe, expect, it } from 'vitest';
import { signalHireSearchPayload, normalizeSearchProfiles } from '../../supabase/functions/_shared/signalhire-search';

describe('SignalHire ICP search', () => {
  it('sends named company contacts as supported top-level filters', () => {
    expect(signalHireSearchPayload({ name: ' Phil Jones ', company: 'Subsea 7', job_title: 'Vice President IT & Digital Solutions' }, 20)).toEqual({
      fullName: 'Phil Jones', currentCompany: 'Subsea 7', currentTitle: 'Vice President IT & Digital Solutions', size: 20,
    });
  });
  it('rejects empty filters before contacting the provider', () => {
    expect(() => signalHireSearchPayload({ name: ' ' }, 20)).toThrow('at least one');
  });
  it('keeps search previews separate from revealed contact details', () => {
    expect(normalizeSearchProfiles([{ uid: 'abc', fullName: 'Phil Jones', currentCompany: 'Subsea 7', currentTitle: 'VP', email: 'not-revealed@example.com' }])[0]).toMatchObject({ id: 'abc', name: 'Phil Jones', company: 'Subsea 7', role: 'VP', email: '' });
  });
});