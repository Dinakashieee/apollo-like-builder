import { describe, expect, it, vi } from 'vitest';
import { checkAiEmailQuota, checkLeadQuota } from '../../supabase/functions/_shared/entitlements';

describe('temporary server feature access', () => {
  it('does not apply a paid lead-count cap', async () => {
    const admin = { rpc: vi.fn().mockResolvedValue({ data: 1000 }) };
    expect(await checkLeadQuota(admin as never, 'workspace')).toBeNull();
    expect(admin.rpc).not.toHaveBeenCalled();
  });
  it('still rejects AI generation at the existing free allowance of 25', async () => {
    const admin = { rpc: vi.fn(async (name: string) => ({ data: name === 'get_workspace_owner_tier' ? 'free' : 25 })) };
    expect(await checkAiEmailQuota(admin as never, 'workspace')).toMatchObject({ blocked: true, used: 25, limit: 25 });
  });
});