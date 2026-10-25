type SendingStateClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => PromiseLike<{ data: { paused?: boolean } | null; error: unknown }>;
      };
    };
  };
};

/** Fail closed on lookup errors; breaks belong to senders, never workspaces. */
export async function isUserSendingPaused(
  client: SendingStateClient,
  userId: string | null | undefined,
): Promise<boolean> {
  if (!userId) return false;
  const { data, error } = await client.from('user_email_sending_state')
    .select('paused').eq('user_id', userId).maybeSingle();
  if (error) throw new Error('Unable to verify email sending status');
  return data?.paused === true;
}