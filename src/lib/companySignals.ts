import { supabase } from '@/integrations/supabase/client';

export async function researchCompany(companyId: string, divisionId?: string, refresh = false) {
  const { data, error } = await supabase.functions.invoke('company-signals', { body: { company_id: companyId, division_id: divisionId, refresh } });
  if (error || data?.error) throw new Error(data?.error ?? error?.message ?? 'Company research failed');
  return data;
}

export async function researchLeadCompanies(workspaceId: string, names: string[]) {
  const unique = new Set(names.map((name) => name.trim().toLowerCase()));
  const { data, error } = await supabase.from('account_intelligence').select('id,company_name,signals_status').eq('workspace_id', workspaceId).eq('signals_status', 'pending');
  if (error) throw error;
  let failed = 0;
  for (const account of data ?? []) {
    if (!unique.has(account.company_name.trim().toLowerCase())) continue;
    try { await researchCompany(account.id); } catch { failed++; }
  }
  return failed;
}

export function csvCell(value: unknown) {
  const text = String(value ?? '');
  return `"${(/^[=+\-@\t\r]/.test(text) ? "'" : '') + text.replace(/"/g, '""')}"`;
}

export function downloadCompanyCsv(rows: unknown[][]) {
  const blob = new Blob(['\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'companies-signals.csv';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}