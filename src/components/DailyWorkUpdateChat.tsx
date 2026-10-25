import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Send, Loader2, Pencil, Trash2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/hooks/useWorkspace';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { dailyWorkUpdateSchema, localWorkDate } from '@/lib/dailyWorkUpdates';

const prompts = ['What did you complete today?', 'What are your next steps?', 'Any blockers?'];
const keys = ['completed', 'next_steps', 'blockers'] as const;
const empty = { completed: '', next_steps: '', blockers: '' };

export function DailyWorkUpdateChat() {
  const { user } = useAuth();
  const { current } = useWorkspace();
  const client = useQueryClient();
  const [date, setDate] = useState(localWorkDate);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(empty);
  const [input, setInput] = useState('');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const query = useQuery({
    queryKey: ['daily-work-updates', user?.id, current?.id], enabled: !!user && !!current,
    queryFn: async () => {
      if (!user || !current) throw new Error('Sign in and choose a workspace.');
      const { data, error } = await supabase.from('daily_work_updates').select('*').eq('user_id', user.id).eq('workspace_id', current.id).order('work_date', { ascending: false }).limit(30);
      if (error) throw error;
      return data;
    },
  });
  useEffect(() => {
    setStep(0); setDraft(empty); setInput(''); setEditing(false); setError('');
  }, [user?.id, current?.id]);
  useEffect(() => {
    const timer = window.setInterval(() => setDate(localWorkDate()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  const today = query.data?.find((row) => row.work_date === date);

  const save = async () => {
    const parsed = dailyWorkUpdateSchema.safeParse(draft);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Check your update.'); return; }
    if (!user || !current) return;
    setBusy(true); setError('');
    try {
      const { error } = await supabase.from('daily_work_updates').upsert({ ...parsed.data, user_id: user.id, workspace_id: current.id, work_date: date, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }, { onConflict: 'user_id,workspace_id,work_date' });
      if (error) throw error;
      await client.invalidateQueries({ queryKey: ['daily-work-updates', user.id, current.id] });
      setEditing(false); setStep(0); setDraft(empty); setInput('');
    } catch { setError('Your update wasn’t saved. Your answers are still here; try again.'); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    if (!today || !user || !current || !window.confirm('Delete today’s work update?')) return;
    setBusy(true);
    const { error } = await supabase.from('daily_work_updates').delete().eq('id', today.id).eq('user_id', user.id).eq('workspace_id', current.id);
    if (error) setError('Could not delete your update.');
    else await query.refetch();
    setBusy(false);
  };

  return <div className="flex-1 min-h-0 flex flex-col">
    <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
      <p className="text-xs text-muted-foreground">{date} · Only you · {Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
      {query.isLoading ? <p className="text-sm">Loading your updates…</p> : query.isError ? <div role="alert"><p className="text-sm text-destructive">Your updates couldn’t load.</p><Button variant="outline" size="sm" onClick={() => void query.refetch()}>Try again</Button></div> : <>
        {today && !editing ? <>
          <p className="text-sm text-success flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Today’s update saved</p>
          {keys.map((key, i) => <div key={key}><p className="text-xs font-semibold">{prompts[i]}</p><p className="text-sm whitespace-pre-wrap break-words mt-1">{today[key] || 'None recorded'}</p></div>)}
          <div className="flex gap-2"><Button size="sm" variant="outline" disabled={busy} onClick={() => { setDraft({ completed: today.completed, next_steps: today.next_steps, blockers: today.blockers }); setEditing(true); setStep(0); setInput(today.completed); }}><Pencil className="h-3 w-3 mr-1" /> Edit update</Button><Button size="icon" variant="ghost" aria-label="Delete today's update" disabled={busy} onClick={() => void remove()}><Trash2 className="h-4 w-4" /></Button></div>
        </> : <>
          {keys.slice(0, Math.min(step, 3)).map((key, i) => <div key={key} className="space-y-2"><p className="bg-muted rounded-lg p-3 text-sm">{prompts[i]}</p><p className="bg-primary text-primary-foreground rounded-lg p-3 text-sm whitespace-pre-wrap break-words">{draft[key] || 'None'}</p></div>)}
          <p className="bg-muted rounded-lg p-3 text-sm">{step < 3 ? prompts[step] : 'Ready to save today’s update?'}</p>
          {step === 3 && <div className="flex gap-2"><Button onClick={() => void save()} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />} Save daily update</Button><Button variant="outline" disabled={busy} onClick={() => { setStep(0); setInput(draft.completed); }}>Review answers</Button></div>}
        </>}
        <div className="border-t border-border pt-3 space-y-3"><h3 className="text-xs font-semibold">Previous updates</h3>{query.data?.filter((row) => row.work_date !== date).map((row) => <details key={row.id} className="text-sm"><summary className="cursor-pointer text-primary">{row.work_date}</summary>{keys.map((key, i) => <div key={key} className="mt-2"><p className="text-xs font-semibold">{prompts[i]}</p><p className="whitespace-pre-wrap break-words">{row[key] || 'None recorded'}</p></div>)}</details>)}{!query.data?.some((row) => row.work_date !== date) && <p className="text-xs text-muted-foreground">No previous updates.</p>}</div>
      </>}
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
    {!query.isLoading && !query.isError && (!today || editing) && step < 3 && <form className="p-3 border-t border-border flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); if (step === 0 && !input.trim()) { setError('Add the work you completed.'); return; } setDraft((value) => ({ ...value, [keys[step]]: input.trim() })); setStep(step + 1); setInput(step < 2 ? draft[keys[step + 1]] : ''); setError(''); }}>
      <Textarea aria-label="Daily update answer" value={input} onChange={(e) => setInput(e.target.value)} maxLength={4000} rows={2} placeholder={step === 0 ? 'Completed work…' : 'Optional — leave blank if none'} className="resize-none min-w-0" />
      <Button type="submit" size="icon" aria-label="Submit update answer"><Send className="h-4 w-4" /></Button>
    </form>}
  </div>;
}