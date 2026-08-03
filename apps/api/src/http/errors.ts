import type { ApiErrorCode, ApiFailure } from '@grey-flowers/contracts';
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { z } from 'zod';

import process from 'node:process';

import type { ApiEnvironment } from './context.js';

interface ApiErrorOptions {
  cause?: unknown;
  fields?: Record<string, string[]>;
  message?: string;
}

const errorStatus: Record<ApiErrorCode, ContentfulStatusCode> = {
  ARTICLE_STALE: 409,
  ASSET_PAYLOAD_TOO_LARGE: 413,
  ASSET_REFERENCED: 409,
  AUTH_FORBIDDEN: 403,
  AUTH_INVALID_CREDENTIALS: 401,
  AUTH_REQUIRED: 401,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
  NOT_FOUND: 404,
  UNSUPPORTED_MEDIA_TYPE: 415,
  UPLOAD_FAILED: 502,
  VALIDATION_FAILED: 400,
};

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

export function validationError(error: z.ZodError): ApiError {
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
}

export function createFailure(
  c: Context<ApiEnvironment>,
  code: ApiErrorCode,
  fields?: Record<string, string[]>,
  message?: string,
) {
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
}

export function createSuccess<TData>(
  c: Context<ApiEnvironment>,
  data: TData,
  status: ContentfulStatusCode = 200,
) {
  return c.json(
    {
      success: true as const,
      data,
      requestId: c.get('requestId'),
    },
    status,
  );
}

export function handleError(error: Error, c: Context<ApiEnvironment>) {
  if (error instanceof ApiError)
    return createFailure(c, error.code, error.fields, error.message);

  process.stderr.write(`Unhandled API error requestId=${c.get('requestId')}\n`);
  return createFailure(c, 'INTERNAL_ERROR');
}
