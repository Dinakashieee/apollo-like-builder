import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/hooks/useWorkspace';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { DailyWorkTaskList } from '@/components/DailyWorkTaskList';
import { summaryWorkDates, type SummaryPeriod } from '@/lib/personalSummary';

export function DailyWorkSummary({ period }: { period: SummaryPeriod }) {
  const { user } = useAuth();
  const { current } = useWorkspace();
  const dates = summaryWorkDates(period);
  const query = useQuery({
    queryKey: ['daily-work-updates', user?.id, current?.id, dates.start, dates.end],
    enabled: !!user && !!current,
    refetchInterval: 60_000,
    queryFn: async () => {
      if (!user || !current) throw new Error('Choose a workspace.');
      const { data, error } = await supabase.from('daily_work_updates').select('*').eq('user_id', user.id).eq('workspace_id', current.id).gte('work_date', dates.start).lte('work_date', dates.end).order('work_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  return <div className="border-t border-border/60 pt-4 space-y-3">
    <h3 className="text-sm font-semibold">Your daily work updates</h3>
    {query.isLoading ? <p className="text-xs text-muted-foreground">Loading work updates…</p> : query.isError ? <div role="alert" className="text-sm text-destructive">Your work updates couldn’t load. <Button size="sm" variant="outline" onClick={() => void query.refetch()}>Try again</Button></div> : !query.data?.length ? <p className="text-xs text-muted-foreground">No work updates in this period.</p> : <>
      <div className="divide-y divide-border/50">
        {query.data.map((update) => <details key={update.id} open={period === 'day'} className="py-2">
          <summary className="text-sm font-medium cursor-pointer">{update.work_date}</summary>
          <dl className="grid gap-3 pt-3 md:grid-cols-3">
            {(['completed', 'next_steps', 'blockers'] as const).map((key, index) => <div key={key} className="min-w-0"><dt className="text-xs font-semibold text-muted-foreground">{['Completed work', 'Next steps', 'Blockers'][index]}</dt><dd className="text-sm whitespace-pre-wrap break-words mt-1">{update[key] || 'None recorded'}</dd></div>)}
          </dl>
        </details>)}
      </div>
      <h3 className="text-sm font-semibold">Your daily tasks</h3>
      <DailyWorkTaskList updateIds={query.data.map((update) => update.id)} />
    </>}
  </div>;
}