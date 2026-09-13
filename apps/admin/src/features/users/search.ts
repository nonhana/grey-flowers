import { z } from 'zod';

export const usersSearchSchema = z.object({
  search: z.string().trim().min(1).max(100).optional().catch(undefined),
  role: z.enum(['USER', 'ADMIN']).optional().catch(undefined),
  page: z.coerce.number().int().min(1).optional().catch(undefined),
});
