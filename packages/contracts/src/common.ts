import { z } from 'zod';

export const positiveIntSchema = z.number().int().positive();

export const nonNegativeIntSchema = z.number().int().min(0);

export const userRoleSchema = z.enum(['USER', 'ADMIN']);

export type UserRole = z.infer<typeof userRoleSchema>;

export const apiErrorCodeSchema = z.enum([
  'VALIDATION_FAILED',
  'AUTH_INVALID_CREDENTIALS',
  'AUTH_REQUIRED',
  'AUTH_FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'ARTICLE_STALE',
  'INTERNAL_ERROR',
  'ASSET_PAYLOAD_TOO_LARGE',
  'UNSUPPORTED_MEDIA_TYPE',
  'UPLOAD_FAILED',
  'ASSET_REFERENCED',
  'RATE_LIMITED',
]);

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;

export const apiErrorStatus = {
  ARTICLE_STALE: 409,
  ASSET_PAYLOAD_TOO_LARGE: 413,
  ASSET_REFERENCED: 409,
  AUTH_FORBIDDEN: 403,
  AUTH_INVALID_CREDENTIALS: 401,
  AUTH_REQUIRED: 401,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  UNSUPPORTED_MEDIA_TYPE: 415,
  UPLOAD_FAILED: 502,
  VALIDATION_FAILED: 400,
} as const satisfies Record<ApiErrorCode, number>;

const apiValidationFieldsSchema = z.record(z.string(), z.array(z.string()));

export const apiFailureSchema = z
  .object({
    success: z.literal(false),
    error: z
      .object({
        code: apiErrorCodeSchema,
        message: z.string(),
        fields: apiValidationFieldsSchema.optional(),
      })
      .strict(),
    requestId: z.uuid(),
  })
  .strict()
  .superRefine(({ error }, context) => {
    if (error.code !== 'VALIDATION_FAILED' && error.fields !== undefined) {
      context.addIssue({
        code: 'custom',
        message: '仅 VALIDATION_FAILED 错误可携带 fields',
        path: ['error', 'fields'],
      });
    }
  });

export type ApiFailure = z.infer<typeof apiFailureSchema>;

export interface ApiSuccess<TData> {
  success: true;
  data: TData;
  requestId: string;
}

export type ApiEnvelope<TData> = ApiSuccess<TData> | ApiFailure;

export const apiSuccessSchema = <TData extends z.ZodType>(
  dataSchema: TData,
) => {
  return z
    .object({
      success: z.literal(true),
      data: dataSchema,
      requestId: z.uuid(),
    })
    .strict();
};

export const apiEnvelopeSchema = <TData extends z.ZodType>(
  dataSchema: TData,
) => {
  return z.union([apiSuccessSchema(dataSchema), apiFailureSchema]);
};
