import { apiErrorMessage } from '@/lib/error-message';

export type ArticleStatusFilter = 'all' | 'draft' | 'published';

export const articleErrorMessage = (error: unknown) =>
  apiErrorMessage(error, {
    ARTICLE_STALE: '这篇文章已在其他窗口被修改，请选择保留哪一份。',
    VALIDATION_FAILED: (e) => {
      const fields = Object.values(e.fields ?? {}).flat();
      return fields.length > 0 ? fields[0] : e.message;
    },
  });

export const slugFromTo = (to: string) => {
  return to.replace(/^\/articles\//, '');
};
