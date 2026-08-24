import { z } from 'zod';

import {
  apiSuccessSchema,
  positiveIntSchema,
  userRoleSchema,
} from './common.js';
import {
  emailInputSchema,
  emailSchema,
  publicUserSchema,
  siteSchema,
  usernameSchema,
} from './users.js';

const passwordSchema = z
  .string()
  .min(8, { message: '密码至少有 8 位' })
  .max(32, { message: '密码不能超过 32 位' });

export const principalSchema = z
  .object({
    userId: positiveIntSchema,
    sessionId: z.string().min(1),
    role: userRoleSchema,
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
    account: z.string().min(1, { message: '账号不能为空' }),
    password: z.string().min(1, { message: '密码不能为空' }),
  })
  .strict();

export type AuthLoginInput = z.infer<typeof authLoginInputSchema>;

export const ACCESS_TOKEN_TTL_SECONDS = 900;

export const authLoginDataSchema = z
  .object({
    accessToken: z.string().min(1),
    expiresIn: z.literal(ACCESS_TOKEN_TTL_SECONDS),
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
      .min(1, { message: '当前密码不能为空' })
      .optional(),
    newPassword: passwordSchema.optional(),
  })
  .strict()
  .refine(
    ({ currentPassword, newPassword }) =>
      (currentPassword === undefined) === (newPassword === undefined),
    {
      message: '当前密码和新密码必须同时填写',
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
