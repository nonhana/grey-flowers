import type { ZodType } from 'zod';

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
