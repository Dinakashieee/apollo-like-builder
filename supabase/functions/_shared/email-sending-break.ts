import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

/** Fail closed on lookup errors; breaks belong to senders, never workspaces. */
export async function isUserSendingPaused(
  client: Pick<SupabaseClient, 'from'>,
  userId: string | null | undefined,
): Promise<boolean> {
  if (!userId) return false;
  const { data, error } = await client.from('user_email_sending_state')
    .select('paused').eq('user_id', userId).maybeSingle();
  if (error) throw new Error('Unable to verify email sending status');
  return data?.paused === true;
}