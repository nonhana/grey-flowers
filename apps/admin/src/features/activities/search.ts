import { z } from 'zod';

export const activitiesSearchSchema = z.object({
  search: z.string().trim().min(1).max(100).optional().catch(undefined),
  page: z.coerce.number().int().min(1).optional().catch(undefined),
});
