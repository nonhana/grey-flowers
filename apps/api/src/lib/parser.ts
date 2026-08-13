import type { ZodType } from 'zod';

import z from 'zod';

import { ApiError } from '../http/errors.js';
import { validationError } from '../http/errors.js';

export const parseBody = async <TInput>(
  request: Request,
  schema: ZodType<TInput>,
): Promise<TInput> => {
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    throw new ApiError('VALIDATION_FAILED', { cause: error });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) throw validationError(parsed.error);

  return parsed.data;
};

export const parseQuery = <TOutput>(
  query: Record<string, string | undefined>,
  schema: ZodType<TOutput>,
): TOutput => {
  const parsed = schema.safeParse(query);
  if (!parsed.success) throw validationError(parsed.error);
  return parsed.data;
};

export const parseId = (value: string | undefined) => {
  const parsed = z.coerce.number().int().positive().safeParse(value);
  if (!parsed.success) throw new ApiError('VALIDATION_FAILED');
  return parsed.data;
};
