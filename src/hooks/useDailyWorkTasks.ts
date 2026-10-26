import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/hooks/useWorkspace';

export function useDailyWorkTasks() {
  const { user } = useAuth();
  const { current } = useWorkspace();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['daily-work-tasks', user?.id, current?.id],
    enabled: !!user && !!current,
    refetchInterval: 60_000,
    queryFn: async () => {
      if (!user || !current) throw new Error('Choose a workspace.');
      const { data, error } = await supabase.from('daily_work_tasks').select('*').eq('user_id', user.id).eq('workspace_id', current.id).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const setDone = async (id: string, done: boolean) => {
    if (!user || !current) throw new Error('Choose a workspace.');
    const { data, error } = await supabase.from('daily_work_tasks').update({ status: done ? 'done' : 'pending' }).eq('id', id).eq('user_id', user.id).eq('workspace_id', current.id).select('id').single();
    if (error || !data) throw error ?? new Error('Task not found.');
    await client.invalidateQueries({ queryKey: ['daily-work-tasks', user.id, current.id] });
  };
  return { ...query, setDone };
}