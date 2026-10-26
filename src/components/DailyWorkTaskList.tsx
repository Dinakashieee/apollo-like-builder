import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useDailyWorkTasks } from '@/hooks/useDailyWorkTasks';

export function DailyWorkTaskList({ updateIds }: { updateIds?: string[] }) {
  const tasks = useDailyWorkTasks();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const rows = tasks.data?.filter((task) => !updateIds || updateIds.includes(task.update_id)) ?? [];
  return <div className="space-y-2">
    {tasks.isLoading ? <p className="text-xs text-muted-foreground">Loading tasks…</p> : tasks.isError ? <div role="alert" className="text-sm text-destructive">Your tasks couldn’t load. <Button size="sm" variant="outline" onClick={() => void tasks.refetch()}>Try again</Button></div> : rows.length === 0 ? <p className="text-xs text-muted-foreground">No daily tasks recorded.</p> : <ul className="divide-y divide-border/50">
      {rows.map((task) => <li key={task.id} className="flex items-start gap-3 py-2">
        <Checkbox id={`task-${task.id}`} aria-label={`Complete task: ${task.note}`} checked={task.status === 'done'} disabled={busy !== null} onCheckedChange={async (checked) => {
          setBusy(task.id); setError('');
          try { await tasks.setDone(task.id, checked === true); } catch { setError('Your task wasn’t updated. Try again.'); } finally { setBusy(null); }
        }} />
        <label htmlFor={`task-${task.id}`} className={`text-sm min-w-0 break-words cursor-pointer ${task.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{task.note}</label>
      </li>)}
    </ul>}
    {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
  </div>;
}