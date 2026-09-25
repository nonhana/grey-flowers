import { z } from 'zod';

export const assetsSearchSchema = z.object({
  status: z.enum(['AVAILABLE', 'PENDING_CLEANUP']).optional().catch(undefined),
  mediaType: z.enum(['IMAGE', 'AUDIO']).optional().catch(undefined),
  page: z.coerce.number().int().min(1).optional().catch(undefined),
});
