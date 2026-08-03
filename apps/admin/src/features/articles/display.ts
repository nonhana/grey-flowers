import { isApiRequestError } from '../../app/api/errors.js';

export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}

export function articleErrorMessage(error: unknown) {
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
}

export function publishedLabel(published: boolean) {
  return published ? '已发布' : '草稿';
}

export function slugFromTo(to: string) {
  return to.replace(/^\/articles\//, '');
}
