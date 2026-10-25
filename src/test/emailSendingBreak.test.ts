import { describe, expect, it, vi } from 'vitest';
import { isUserSendingPaused } from '../../supabase/functions/_shared/email-sending-break';

function clientFor(states: Record<string, boolean>, failed = false) {
  const eq = vi.fn((_column: string, id: string) => ({
    maybeSingle: async () => ({ data: id in states ? { paused: states[id] } : null, error: failed ? new Error('offline') : null }),
  }));
  const client = { from: vi.fn(() => ({ select: () => ({ eq }) })) };
  return { client: client as unknown as Parameters<typeof isUserSendingPaused>[0], eq };
}

describe('per-user email breaks', () => {
  it('pauses only the individual user, not other users', async () => {
    const { client } = clientFor({ alice: true, bob: false });
    expect(await isUserSendingPaused(client, 'alice')).toBe(true);
    expect(await isUserSendingPaused(client, 'bob')).toBe(false);
  });
  it('allows sending again after explicit resume', async () => {
    const states = { alice: true };
    const { client } = clientFor(states);
    expect(await isUserSendingPaused(client, 'alice')).toBe(true);
    states.alice = false;
    expect(await isUserSendingPaused(client, 'alice')).toBe(false);
  });
  it('does not bypass a break if the status lookup fails', async () => {
    const { client } = clientFor({}, true);
    await expect(isUserSendingPaused(client, 'alice')).rejects.toThrow('Unable to verify');
  });
  it('does not pause essential system emails without a sender', async () => {
    const { client, eq } = clientFor({ alice: true });
    expect(await isUserSendingPaused(client, null)).toBe(false);
    expect(eq).not.toHaveBeenCalled();
  });
});