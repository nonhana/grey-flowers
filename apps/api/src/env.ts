import { Buffer } from 'node:buffer';
import { z } from 'zod';

const productionOrigins = [
  'https://caelum.moe',
  'https://admin.caelum.moe',
] as const;

const base64urlSecret = z.string().superRefine((value, context) => {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    context.addIssue({
      code: 'custom',
      message: 'must be a base64url value',
    });
    return;
  }

  if (Buffer.from(value, 'base64url').byteLength < 32) {
    context.addIssue({
      code: 'custom',
      message: 'must decode to at least 32 bytes',
    });
  }
});

const postgresUrl = z.url().refine(
  (value) => {
    const protocol = new URL(value).protocol;
    return protocol === 'postgres:' || protocol === 'postgresql:';
  },
  { message: 'must be a PostgreSQL URL' },
);

const port = z.coerce.number().int().min(1).max(65_535);

const r2AccountId = z.string().min(1);
const r2AccessKeyId = z.string().min(1);
const r2SecretAccessKey = z.string().min(1);
const r2BucketName = z.string().min(1);
const r2PublicUrl = z.url();

/** 评论回复邮件开关（与主站 .env 同一键名，见 .env.example / deploy.yml）。 */
const mailEnable = z.literal('true').or(z.literal('false')).default('false');
const resendApiKey = z.string().optional();
const resendFrom = z.string().optional();

const environmentSchema = z
  .discriminatedUnion('NODE_ENV', [
    z.object({
      ADMIN_PORT: port,
      API_PORT: port,
      AUTH_ACCESS_TOKEN_SECRET: base64urlSecret,
      AUTH_REFRESH_TOKEN_PEPPER: base64urlSecret,
      HANA_DATABASE_URL: postgresUrl,
      MAIN_PORT: port,
      HANA_MAIL_ENABLE: mailEnable,
      NODE_ENV: z.literal('development'),
      R2_ACCESS_KEY_ID: r2AccessKeyId,
      R2_ACCOUNT_ID: r2AccountId,
      R2_BUCKET_NAME: r2BucketName,
      R2_PUBLIC_URL: r2PublicUrl,
      R2_SECRET_ACCESS_KEY: r2SecretAccessKey,
      RESEND_API_KEY: resendApiKey,
      RESEND_FROM: resendFrom,
    }),
    z.object({
      ADMIN_PORT: port.optional(),
      API_PORT: port,
      AUTH_ACCESS_TOKEN_SECRET: base64urlSecret,
      AUTH_REFRESH_TOKEN_PEPPER: base64urlSecret,
      HANA_DATABASE_URL: postgresUrl,
      MAIN_PORT: port.optional(),
      HANA_MAIL_ENABLE: mailEnable,
      NODE_ENV: z.literal('production'),
      R2_ACCESS_KEY_ID: r2AccessKeyId,
      R2_ACCOUNT_ID: r2AccountId,
      R2_BUCKET_NAME: r2BucketName,
      R2_PUBLIC_URL: r2PublicUrl,
      R2_SECRET_ACCESS_KEY: r2SecretAccessKey,
      RESEND_API_KEY: resendApiKey,
      RESEND_FROM: resendFrom,
    }),
  ])
  .superRefine((env, context) => {
    if (env.AUTH_ACCESS_TOKEN_SECRET === env.AUTH_REFRESH_TOKEN_PEPPER) {
      context.addIssue({
        code: 'custom',
        message:
          'AUTH_ACCESS_TOKEN_SECRET and AUTH_REFRESH_TOKEN_PEPPER must differ',
        path: ['AUTH_REFRESH_TOKEN_PEPPER'],
      });
    }
  });

type ParsedApiEnvironment = z.output<typeof environmentSchema>;

export type ApiEnvironment = ParsedApiEnvironment & {
  ASSET_PUBLIC_URL: string;
  AUTH_ALLOWED_ORIGINS: string[];
  AUTH_COOKIE_SECURE: boolean;
  AUTH_JWT_ISSUER: string;
  R2_ENDPOINT: string;
  R2_REGION: string;
};

const deriveAssetEnvironment = (env: ParsedApiEnvironment) => {
  return {
    ASSET_PUBLIC_URL: env.R2_PUBLIC_URL,
    R2_ENDPOINT: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    R2_REGION: 'auto',
  };
};

const deriveAuthenticationEnvironment = (env: ParsedApiEnvironment) => {
  if (env.NODE_ENV === 'production') {
    return {
      AUTH_ALLOWED_ORIGINS: [...productionOrigins],
      AUTH_COOKIE_SECURE: true,
      AUTH_JWT_ISSUER: 'https://api.caelum.moe',
    };
  }

  return {
    AUTH_ALLOWED_ORIGINS: [
      `http://localhost:${env.MAIN_PORT}`,
      `http://localhost:${env.ADMIN_PORT}`,
    ],
    AUTH_COOKIE_SECURE: false,
    AUTH_JWT_ISSUER: `http://localhost:${env.API_PORT}`,
  };
};

export const readApiEnvironment = (env: NodeJS.ProcessEnv): ApiEnvironment => {
  const parsedEnvironment = environmentSchema.parse(env);
  return {
    ...parsedEnvironment,
    ...deriveAssetEnvironment(parsedEnvironment),
    ...deriveAuthenticationEnvironment(parsedEnvironment),
  };
};
