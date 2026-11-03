import { isUserSendingPaused } from './email-sending-break.ts';

type ScheduledEmail = {
  id: string; user_id: string; workspace_id: string; send_via: string;
  to_email: string; subject: string | null; body: string;
};
type DbError = { message: string } | null;
type SchedulerClient = Parameters<typeof isUserSendingPaused>[0] & {
  rpc: (name: string, args: { _now: string }) => PromiseLike<{ data: ScheduledEmail[] | null; error: DbError }>;
  from: ((table: string) => {
    update: (values: Record<string, unknown>) => {
      eq: (column: string, id: string) => PromiseLike<{ error: DbError }>;
    };
  });
  functions: {
    invoke: (name: string, options: { body: Record<string, unknown> }) => PromiseLike<{
      error: { message: string; context?: { status?: number } } | null;
    }>;
  };
};

export async function processScheduledBatch(admin: SchedulerClient, now = new Date()) {
  const { data: due, error } = await admin.rpc('select_due_scheduled_emails', { _now: now.toISOString() });
  if (error) throw new Error('Unable to select scheduled emails');
  const results: { id: string; deferred?: boolean; ok?: boolean }[] = [];
  const update = async (id: string, values: Record<string, unknown>) => {
    const { error } = await admin.from('scheduled_emails').update(values).eq('id', id);
    if (error) throw new Error('Unable to persist scheduled email state');
  };
  const defer = async (id: string) => {
    await update(id, { retry_after: new Date(now.getTime() + 60_000).toISOString() });
    results.push({ id, deferred: true });
  };
  for (const row of due ?? []) {
    // Recheck in case the sender paused after selection; fail closed on lookup errors.
    let paused: boolean;
    try { paused = await isUserSendingPaused(admin, row.user_id); }
    catch { await defer(row.id); continue; }
    if (paused) { results.push({ id: row.id, deferred: true }); continue; }
    let sendError: string | undefined;
    if (row.send_via === 'builtin') {
      try {
        const r = await admin.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'lead-added', recipientEmail: row.to_email,
            idempotencyKey: `scheduled-${row.id}`,
            templateData: { subject: row.subject, body: row.body },
            sender_user_id: row.user_id, workspace_id: row.workspace_id,
          },
        });
        if (r.error?.context?.status === 409 || r.error?.context?.status === 503) {
          await defer(row.id);
          continue;
        }
        sendError = r.error?.message;
      } catch {
        // Unknown transport outcomes are retried using the same idempotency key.
        await defer(row.id);
        continue;
      }
    }
    if (sendError) {
      await update(row.id, { status: 'failed', error: sendError, retry_after: null });
      results.push({ id: row.id, ok: false });
    } else {
      // Preserve existing connected/mailto handling; delivery verification is out of scope.
      await update(row.id, { status: 'sent', sent_at: now.toISOString(), retry_after: null });
      results.push({ id: row.id, ok: true });
    }
  }
  return { processed: results.length, results };
}