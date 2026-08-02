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

const environmentSchema = z
  .discriminatedUnion('NODE_ENV', [
    z.object({
      ADMIN_PORT: port,
      API_PORT: port,
      AUTH_ACCESS_TOKEN_SECRET: base64urlSecret,
      AUTH_REFRESH_TOKEN_PEPPER: base64urlSecret,
      HANA_DATABASE_URL: postgresUrl,
      MAIN_PORT: port,
      NODE_ENV: z.literal('development'),
    }),
    z.object({
      ADMIN_PORT: port.optional(),
      API_PORT: port,
      AUTH_ACCESS_TOKEN_SECRET: base64urlSecret,
      AUTH_REFRESH_TOKEN_PEPPER: base64urlSecret,
      HANA_DATABASE_URL: postgresUrl,
      MAIN_PORT: port.optional(),
      NODE_ENV: z.literal('production'),
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
  AUTH_ALLOWED_ORIGINS: string[];
  AUTH_COOKIE_SECURE: boolean;
  AUTH_JWT_ISSUER: string;
};

function deriveAuthenticationEnvironment(env: ParsedApiEnvironment) {
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
}

export function readApiEnvironment(env: NodeJS.ProcessEnv): ApiEnvironment {
  const parsedEnvironment = environmentSchema.parse(env);
  return {
    ...parsedEnvironment,
    ...deriveAuthenticationEnvironment(parsedEnvironment),
  };
}
