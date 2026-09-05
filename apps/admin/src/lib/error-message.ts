import type { ApiErrorCode } from '@grey-flowers/contracts';

import { type ApiRequestError, isApiRequestError } from '@/app/api/errors';

export const GENERIC_FALLBACK = '暂时无法完成此操作。';
export const AUTH_FORBIDDEN_MESSAGE = '当前账户没有执行该操作的权限。';

export type CodeMessage = string | ((error: ApiRequestError) => string);

const COMMON: Partial<Record<ApiErrorCode, CodeMessage>> = {
  AUTH_FORBIDDEN: AUTH_FORBIDDEN_MESSAGE,
};

/**
 * API 错误 → 用户可读文案：按错误码查表（可返回字符串或基于错误的函数），
 * 未命中退回服务端 message；非请求错误走通用兜底。
 */
export const apiErrorMessage = (
  error: unknown,
  byCode: Partial<Record<ApiErrorCode, CodeMessage>> = {},
  fallback = GENERIC_FALLBACK,
) => {
  if (!isApiRequestError(error)) return fallback;
  const mapped = byCode[error.code] ?? COMMON[error.code];
  return typeof mapped === 'function'
    ? mapped(error)
    : (mapped ?? error.message);
};
