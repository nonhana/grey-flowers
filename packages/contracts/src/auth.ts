import { z } from 'zod';

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
]);

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;

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
        message: 'Only VALIDATION_FAILED may include fields',
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

const usernameSchema = z
  .string()
  .min(1, { message: 'Username must not be empty' })
  .max(16, { message: 'Username must not exceed 16 characters' });

const emailInputSchema = z.email({ message: 'Invalid email format' }).trim();

const emailSchema = z.email();

const siteSchema = z.url({ message: 'Invalid site URL' });

const passwordSchema = z
  .string()
  .min(8, { message: 'Password must be at least 8 characters' })
  .max(32, { message: 'Password must not exceed 32 characters' });

export const publicUserSchema = z
  .object({
    id: z.number().int().positive(),
    email: emailSchema,
    username: usernameSchema,
    avatar: z.string(),
    site: siteSchema.nullable(),
  })
  .strict();

export type PublicUser = z.infer<typeof publicUserSchema>;

export const principalSchema = z
  .object({
    userId: z.number().int().positive(),
    sessionId: z.string().min(1),
    role: z.enum(['USER', 'ADMIN']),
    email: emailSchema,
    username: usernameSchema,
    avatar: z.string(),
    site: siteSchema.nullable(),
  })
  .strict();

export type Principal = z.infer<typeof principalSchema>;

export const authRegisterInputSchema = z
  .object({
    username: usernameSchema,
    email: emailInputSchema,
    password: passwordSchema,
    site: siteSchema.optional(),
  })
  .strict();

export type AuthRegisterInput = z.infer<typeof authRegisterInputSchema>;

export const authRegisterDataSchema = z
  .object({ user: publicUserSchema })
  .strict();

export const authRegisterResponseSchema = apiSuccessSchema(
  authRegisterDataSchema,
);

export type AuthRegisterData = z.infer<typeof authRegisterDataSchema>;
export type AuthRegisterResponse = z.infer<typeof authRegisterResponseSchema>;

export const authLoginInputSchema = z
  .object({
    account: z.string().min(1, { message: 'Account must not be empty' }),
    password: z.string().min(1, { message: 'Password must not be empty' }),
  })
  .strict();

export type AuthLoginInput = z.infer<typeof authLoginInputSchema>;

export const authLoginDataSchema = z
  .object({
    accessToken: z.string().min(1),
    expiresIn: z.literal(900),
    principal: principalSchema,
  })
  .strict();

export const authLoginResponseSchema = apiSuccessSchema(authLoginDataSchema);

export type AuthLoginData = z.infer<typeof authLoginDataSchema>;
export type AuthLoginResponse = z.infer<typeof authLoginResponseSchema>;

export const authRefreshInputSchema = z.undefined();

export type AuthRefreshInput = z.infer<typeof authRefreshInputSchema>;

export const authRefreshDataSchema = authLoginDataSchema;

export const authRefreshResponseSchema = apiSuccessSchema(
  authRefreshDataSchema,
);

export type AuthRefreshData = z.infer<typeof authRefreshDataSchema>;
export type AuthRefreshResponse = z.infer<typeof authRefreshResponseSchema>;

export const authLogoutInputSchema = z.undefined();

export type AuthLogoutInput = z.infer<typeof authLogoutInputSchema>;

export const authLogoutDataSchema = z.object({}).strict();

export const authLogoutResponseSchema = apiSuccessSchema(authLogoutDataSchema);

export type AuthLogoutData = z.infer<typeof authLogoutDataSchema>;
export type AuthLogoutResponse = z.infer<typeof authLogoutResponseSchema>;

export const authSessionInputSchema = z.undefined();

export type AuthSessionInput = z.infer<typeof authSessionInputSchema>;

export const authSessionDataSchema = z
  .object({ principal: principalSchema })
  .strict();

export const authSessionResponseSchema = apiSuccessSchema(
  authSessionDataSchema,
);

export type AuthSessionData = z.infer<typeof authSessionDataSchema>;
export type AuthSessionResponse = z.infer<typeof authSessionResponseSchema>;

export const authUpdateMeInputSchema = z
  .object({
    username: usernameSchema.optional(),
    email: emailInputSchema.optional(),
    site: siteSchema.nullable().optional(),
    currentPassword: z
      .string()
      .min(1, { message: 'Current password must not be empty' })
      .optional(),
    newPassword: passwordSchema.optional(),
  })
  .strict()
  .refine(
    ({ currentPassword, newPassword }) =>
      (currentPassword === undefined) === (newPassword === undefined),
    {
      message: 'Current password and new password must be provided together',
      path: ['newPassword'],
    },
  );

export type AuthUpdateMeInput = z.infer<typeof authUpdateMeInputSchema>;

export const authUpdateMeDataSchema = z
  .object({
    principal: principalSchema,
    requiresReauthentication: z.boolean(),
  })
  .strict();

export const authUpdateMeResponseSchema = apiSuccessSchema(
  authUpdateMeDataSchema,
);

export type AuthUpdateMeData = z.infer<typeof authUpdateMeDataSchema>;
export type AuthUpdateMeResponse = z.infer<typeof authUpdateMeResponseSchema>;
