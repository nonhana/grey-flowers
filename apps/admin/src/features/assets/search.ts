import { z } from 'zod';

export const assetsSearchSchema = z.object({
  status: z.enum(['AVAILABLE', 'PENDING_CLEANUP']).optional().catch(undefined),
  mediaType: z.enum(['IMAGE', 'AUDIO']).optional().catch(undefined),
  purpose: z
    .enum([
      'ARTICLE_COVER',
      'ARTICLE_INLINE',
      'CATEGORY_COVER',
      'ACTIVITY_IMAGE',
      'MUSIC_SOURCE',
      'MUSIC_COVER',
    ])
    .optional()
    .catch(undefined),
  page: z.coerce.number().int().min(1).optional().catch(undefined),
});
