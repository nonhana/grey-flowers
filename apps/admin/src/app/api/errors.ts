import { type ApiErrorCode, type ApiFailure } from '@grey-flowers/contracts';

export class ApiRequestError extends Error {
  readonly code: ApiErrorCode;
  readonly fields: ApiFailure['error']['fields'];
  readonly requestId: string;
  readonly status: number;

  constructor(failure: ApiFailure, status: number) {
    super(failure.error.message);
    this.name = 'ApiRequestError';
    this.code = failure.error.code;
    this.fields = failure.error.fields;
    this.requestId = failure.requestId;
    this.status = status;
  }
}

export class ApiNetworkError extends Error {
  constructor(cause: unknown) {
    super('无法连接服务。');
    this.name = 'ApiNetworkError';
    this.cause = cause;
  }
}

export class ApiResponseError extends Error {
  constructor() {
    super('服务返回了无法识别的响应。');
    this.name = 'ApiResponseError';
  }
}

export const isApiRequestError = (
  error: unknown,
  code?: ApiErrorCode,
): error is ApiRequestError => {
  return (
    error instanceof ApiRequestError &&
    (code === undefined || error.code === code)
  );
};

export const isApiNetworkError = (error: unknown): error is ApiNetworkError =>
  error instanceof ApiNetworkError;
