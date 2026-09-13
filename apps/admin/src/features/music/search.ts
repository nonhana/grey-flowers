import { z } from 'zod';

export const musicSearchSchema = z.object({
  search: z.string().trim().min(1).max(100).optional().catch(undefined),
  incomplete: z.boolean().optional().catch(undefined),
  page: z.coerce.number().int().min(1).optional().catch(undefined),
});
