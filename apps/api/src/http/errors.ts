import type { Context, ErrorHandler } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { z } from 'zod';

import {
  apiErrorStatus,
  type ApiErrorCode,
  type ApiFailure,
} from '@grey-flowers/contracts';

import type { ApiEnvironment } from './context';

interface ApiErrorOptions {
  cause?: unknown;
  fields?: Record<string, string[]>;
  message?: string;
}

// status 语义的 SSOT 在 contracts 的 apiErrorStatus；此处只做类型收口（契约包禁止依赖 Hono）。
const errorStatus = apiErrorStatus as Record<
  ApiErrorCode,
  ContentfulStatusCode
>;

const errorMessages: Record<ApiErrorCode, string> = {
  ARTICLE_STALE:
    'Article has been changed elsewhere; resolve the conflict first',
  ASSET_PAYLOAD_TOO_LARGE: 'Asset payload exceeds the allowed size',
  ASSET_REFERENCED: 'Asset is still in use and cannot be changed',
  AUTH_FORBIDDEN: 'Access is forbidden',
  AUTH_INVALID_CREDENTIALS: 'Invalid account or password',
  AUTH_REQUIRED: 'Authentication is required',
  CONFLICT: 'Request conflicts with the current state',
  INTERNAL_ERROR: 'An unexpected error occurred',
  NOT_FOUND: 'Resource not found',
  RATE_LIMITED: 'Too many requests; please try again later',
  UNSUPPORTED_MEDIA_TYPE: 'Unsupported media type',
  UPLOAD_FAILED: 'Upload failed',
  VALIDATION_FAILED: 'The request is invalid',
};

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly fields?: Record<string, string[]>;

  constructor(code: ApiErrorCode, options: ApiErrorOptions = {}) {
    super(options.message ?? errorMessages[code], { cause: options.cause });
    this.code = code;
    this.fields = options.fields;
  }
}

export const validationError = (error: z.ZodError): ApiError => {
  const fields = error.issues.reduce<Record<string, string[]>>(
    (result, issue) => {
      if (issue.code === 'unrecognized_keys') return result;

      const field = issue.path[0];
      if (typeof field !== 'string') return result;

      (result[field] ??= []).push(issue.message);
      return result;
    },
    {},
  );

  return new ApiError('VALIDATION_FAILED', {
    cause: error,
    fields: Object.keys(fields).length > 0 ? fields : undefined,
  });
};

export const createFailure = (
  c: Context<ApiEnvironment>,
  code: ApiErrorCode,
  fields?: Record<string, string[]>,
  message?: string,
) => {
  const body: ApiFailure = {
    success: false,
    error: {
      code,
      message: message ?? errorMessages[code],
      ...(fields ? { fields } : {}),
    },
    requestId: c.get('requestId'),
  };

  return c.json(body, errorStatus[code]);
};

export const createSuccess = <TData>(
  c: Context<ApiEnvironment>,
  data: TData,
  status: ContentfulStatusCode = 200,
) => {
  return c.json(
    {
      success: true as const,
      data,
      requestId: c.get('requestId'),
    },
    status,
  );
};

export const handleError: ErrorHandler<ApiEnvironment> = (error, c) => {
  if (error instanceof ApiError) {
    if (error.code === 'INTERNAL_ERROR') {
      c.get('dependencies').logger.error(
        { cause: error.cause, err: error, requestId: c.get('requestId') },
        'Internal API error',
      );
    }
    return createFailure(c, error.code, error.fields, error.message);
  }

  const requestId = c.get('requestId');
  c.get('dependencies').logger.error(
    { err: error, requestId },
    'Unhandled API error',
  );
  return createFailure(c, 'INTERNAL_ERROR');
};
