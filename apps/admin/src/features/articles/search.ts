import { z } from 'zod';

export const articlesSearchSchema = z.object({
  status: z.enum(['draft', 'published']).optional().catch(undefined),
  q: z.string().trim().min(1).max(200).optional().catch(undefined),
  page: z.coerce.number().int().min(1).optional().catch(undefined),
});
