import { isApiRequestError } from '@/app/api/errors.js';

export type ArticleStatusFilter = 'all' | 'draft' | 'published';

/** URL 是文章列表筛选的唯一真相，所以侧栏的子项可以直接深链。 */
export const parseStatusFilter = (value: unknown): ArticleStatusFilter =>
  value === 'draft' || value === 'published' ? value : 'all';

export const formatDateTime = (iso: string) => {
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
};

export const articleErrorMessage = (error: unknown) => {
  if (isApiRequestError(error)) {
    switch (error.code) {
      case 'ARTICLE_STALE':
        return '这篇文章已在其他窗口被修改，请选择保留哪一份。';
      case 'AUTH_FORBIDDEN':
        return '当前账户没有执行该操作的权限。';
      case 'CONFLICT':
        return error.message;
      case 'VALIDATION_FAILED': {
        const fields = Object.values(error.fields ?? {}).flat();
        return fields.length > 0 ? fields[0] : error.message;
      }
      default:
        return error.message;
    }
  }

  return '暂时无法完成此操作。';
};

export const publishedLabel = (published: boolean) => {
  return published ? '已发布' : '草稿';
};

export const slugFromTo = (to: string) => {
  return to.replace(/^\/articles\//, '');
};
