import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { useWorkspace } from '@/hooks/useWorkspace';
import { supabase } from '@/integrations/supabase/client';
import { researchCompany } from '@/lib/companySignals';
import { toast } from '@/hooks/use-toast';

export function CompanyImportDialog({ onImported }: { onImported: () => void }) {
  const { current } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<{ company_name: string; domain: string | null; notes: string | null }[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const read = async (file: File) => {
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!sheet) throw new Error('No worksheet found');
      const parsed = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
      const value = (row: Record<string, unknown>, pattern: RegExp) => String(Object.entries(row).find(([key]) => pattern.test(key.trim()))?.[1] ?? '').trim();
      const companies = parsed.map((row) => ({ company_name: value(row, /^(company|company[ _]name|business|organization|account|name)$/i), domain: value(row, /^(website|domain|url)$/i) || null, notes: value(row, /^notes?$/i) || null })).filter((row) => row.company_name);
      if (!companies.length) throw new Error('No company names found. Include a Company or Company name column.');
      setRows(companies);
    } catch (error) { toast({ title: 'Could not read file', description: error instanceof Error ? error.message : 'Invalid file', variant: 'destructive' }); }
  };
  const save = async () => {
    if (!current) return;
    setBusy(true);
    let added = 0, skipped = 0, failedResearch = 0;
    try {
      for (const row of rows) {
        const { data, error } = await supabase.from('account_intelligence').insert({ ...row, workspace_id: current.id }).select('id').single();
        if (error) { if (error.code === '23505') { skipped++; continue; } throw error; }
        added++;
        try { await researchCompany(data.id); } catch { failedResearch++; }
      }
      toast({ title: 'Companies imported', description: `${added} added · ${skipped} duplicates skipped${failedResearch ? ` · ${failedResearch} need a signal refresh` : ''}` });
      setOpen(false); setRows([]);
    } catch (error) { toast({ title: `${added} companies added; import stopped`, description: error instanceof Error ? error.message : 'Import failed', variant: 'destructive' }); }
    finally { setBusy(false); onImported(); }
  };
  return <Dialog open={open} onOpenChange={(value) => { if (!busy) { setOpen(value); if (!value) setRows([]); } }}>
    <DialogTrigger asChild><Button variant="outline" className="gap-2 h-11"><Upload className="h-4 w-4" /> Import</Button></DialogTrigger>
    <DialogContent><DialogHeader><DialogTitle>Import companies</DialogTitle><DialogDescription>CSV or Excel · Company, Website, Notes</DialogDescription></DialogHeader>
      <input ref={input} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void read(file); }} />
      <Button variant="outline" disabled={busy} onClick={() => input.current?.click()}><Upload className="h-4 w-4 mr-2" /> Choose file</Button>
      {rows.length > 0 && <div className="max-h-60 overflow-auto text-sm"><p className="font-medium mb-2">{rows.length} companies</p>{rows.slice(0, 5).map((row, index) => <p key={index}>{row.company_name} {row.domain && `· ${row.domain}`}</p>)}</div>}
      <DialogFooter><Button disabled={busy || !rows.length} onClick={save}>{busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{busy ? 'Importing and researching…' : 'Import companies'}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}