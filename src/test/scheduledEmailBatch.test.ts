import { describe, expect, it, vi } from 'vitest';
import { processScheduledBatch } from '../../supabase/functions/_shared/scheduled-email-batch';

const now = new Date('2026-11-03T00:00:00Z');
function fixture(options: { selectionError?: boolean; lookupError?: boolean; paused?: boolean; status?: number; updateError?: boolean } = {}) {
  const row = { id: 'one', user_id: 'alice', workspace_id: 'workspace', send_via: 'builtin', to_email: 'test@example.invalid', subject: 'test', body: 'test' };
  const update = vi.fn(() => ({ eq: async () => ({ error: options.updateError ? { message: 'offline' } : null }) }));
  const invoke = vi.fn(async () => ({ error: options.status ? { message: 'retry', context: { status: options.status } } : null }));
  const rpc = vi.fn(async () => ({ data: [row], error: options.selectionError ? { message: 'offline' } : null }));
  const client = {
    rpc, functions: { invoke }, from: () => ({ update,
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { paused: options.paused }, error: options.lookupError ? 'offline' : null }) }) }),
    }),
  };
  return { client, rpc, update, invoke };
}
describe('scheduled email eligibility and deferral', () => {
  it('fails closed on selection errors', async () => {
    const f = fixture({ selectionError: true });
    await expect(processScheduledBatch(f.client, now)).rejects.toThrow('select');
    expect(f.invoke).not.toHaveBeenCalled();
  });
  it('rechecks sender pause and never sends or modifies paused rows', async () => {
    const f = fixture({ paused: true });
    expect((await processScheduledBatch(f.client, now)).results).toEqual([{ id: 'one', deferred: true }]);
    expect(f.invoke).not.toHaveBeenCalled(); expect(f.update).not.toHaveBeenCalled();
  });
  it('fails closed and backs off when the sender state cannot be checked', async () => {
    const f = fixture({ lookupError: true });
    await processScheduledBatch(f.client, now);
    expect(f.invoke).not.toHaveBeenCalled();
    expect(f.update).toHaveBeenCalledWith({ retry_after: '2026-11-03T00:01:00.000Z' });
  });
  it.each([409, 503])('keeps status and original schedule unchanged for a %s deferral', async (status) => {
    const f = fixture({ status });
    await processScheduledBatch(f.client, now);
    expect(f.update).toHaveBeenCalledExactlyOnceWith({ retry_after: '2026-11-03T00:01:00.000Z' });
  });
  it('surfaces deferral persistence failures', async () => {
    const f = fixture({ status: 409, updateError: true });
    await expect(processScheduledBatch(f.client, now)).rejects.toThrow('persist');
  });
});