import { describe, it, expect } from 'vitest';
import { dailyWorkUpdateSchema, localWorkDate } from '@/lib/dailyWorkUpdates';

describe('Daily work updates', () => {
  it('requires completed work while allowing no next steps or blockers', () => {
    expect(dailyWorkUpdateSchema.safeParse({ completed: '  ', next_steps: '', blockers: '' }).success).toBe(false);
    expect(dailyWorkUpdateSchema.parse({ completed: '  Called three prospects  ', next_steps: '', blockers: '' }).completed).toBe('Called three prospects');
  });
  it('limits each answer to 4000 characters', () => {
    for (const key of ['completed', 'next_steps', 'blockers']) {
      expect(dailyWorkUpdateSchema.safeParse({ completed: 'Done', next_steps: '', blockers: '', [key]: 'x'.repeat(4001) }).success).toBe(false);
    }
  });
  it('uses the user’s local calendar day', () => {
    expect(localWorkDate(new Date(2026, 9, 26, 0, 15))).toBe('2026-10-26');
  });
});