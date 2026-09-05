import { apiErrorMessage } from '@/lib/error-message';

export type ArticleStatusFilter = 'all' | 'draft' | 'published';

/** URL 是文章列表筛选的唯一真相，所以侧栏的子项可以直接深链。 */
export const parseStatusFilter = (value: unknown): ArticleStatusFilter =>
  value === 'draft' || value === 'published' ? value : 'all';

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
