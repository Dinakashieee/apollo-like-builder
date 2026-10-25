import { z } from 'zod';

export const dailyWorkUpdateSchema = z.object({
  completed: z.string().trim().min(1, 'Add the work you completed.').max(4000),
  next_steps: z.string().trim().max(4000),
  blockers: z.string().trim().max(4000),
});

export function localWorkDate(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}