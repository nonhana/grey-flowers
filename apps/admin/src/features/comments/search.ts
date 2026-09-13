import { z } from 'zod';

export const commentsSearchSchema = z.object({
  search: z.string().trim().min(1).max(50).optional().catch(undefined),
  path: z.string().trim().min(1).max(300).optional().catch(undefined),
  authorId: z.coerce.number().int().positive().optional().catch(undefined),
  startDate: z.iso.date().optional().catch(undefined),
  endDate: z.iso.date().optional().catch(undefined),
  page: z.coerce.number().int().min(1).optional().catch(undefined),
});
