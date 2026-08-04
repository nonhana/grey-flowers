import { isApiRequestError } from '@/app/api/errors.js';

/** Typora 口径：mm:ss。秒数小于 0 或非有限值一律显示 0:00。 */
export const formatDuration = (seconds: number) => {
  const safe =
    Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const minutes = Math.floor(safe / 60);
  return `${minutes}:${String(safe % 60).padStart(2, '0')}`;
};

export const formatDateTime = (iso: string) => {
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
};

export const musicErrorMessage = (error: unknown) => {
  if (isApiRequestError(error)) {
    switch (error.code) {
      case 'VALIDATION_FAILED':
        return error.message;
      case 'AUTH_FORBIDDEN':
        return '当前账户没有执行该操作的权限。';
      default:
        return error.message;
    }
  }

  return '暂时无法完成此操作。';
};
