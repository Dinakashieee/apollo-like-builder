import { beforeEach, describe, expect, it, vi } from 'vitest';
const { invoke, query } = vi.hoisted(() => ({ invoke: vi.fn(), query: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke }, from: () => ({ select: () => ({ eq: () => ({ eq: query }) }) }) } }));
import { researchLeadCompanies, researchCompany, csvCell } from '@/lib/companySignals';

describe('company signals across acquisition paths', () => {
  beforeEach(() => { vi.clearAllMocks(); invoke.mockResolvedValue({ data: { status: 'ready' }, error: null }); query.mockResolvedValue({ data: [{ id: 'ccl', company_name: 'CCL design', signals_status: 'pending' }], error: null }); });
  it('researches one company for duplicate imported or claimed contacts', async () => {
    await researchLeadCompanies('workspace', ['CCL design', ' ccl DESIGN ']);
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith('company-signals', { body: { company_id: 'ccl', division_id: undefined, refresh: false } });
  });
  it('researches manually added companies without accepting customer scores', async () => {
    await researchCompany('ccl');
    expect(invoke).toHaveBeenCalledWith('company-signals', { body: { company_id: 'ccl', division_id: undefined, refresh: false } });
  });
  it('keeps research failures separate from saved leads', async () => {
    invoke.mockResolvedValue({ data: { error: 'Research unavailable' }, error: null });
    expect(await researchLeadCompanies('workspace', ['CCL design'])).toBe(1);
  });
  it('exports quoted data without executable spreadsheet formulas', () => {
    expect(csvCell('=HYPERLINK("bad")')).toBe('"\'=HYPERLINK(""bad"")"');
    expect(csvCell('CCL, design')).toBe('"CCL, design"');
  });
});