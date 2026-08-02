import { SignJWT, jwtVerify } from 'jose';
import { Buffer } from 'node:buffer';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

import type { ApiEnvironment } from '../../env.js';

export const ACCESS_TOKEN_AUDIENCE = 'grey-flowers-web';
export const ACCESS_TOKEN_TTL_SECONDS = 900;
export const REFRESH_COOKIE_NAME = 'gf_refresh';
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const SESSION_TTL_SECONDS = SESSION_TTL_MS / 1000;

const cuidPattern = /^c[a-z0-9]{24}$/;
const refreshSecretPattern = /^[A-Za-z0-9_-]{43}$/;
const decimalUserIdPattern = /^[1-9][0-9]*$/;

const accessTokenUserIdSchema = z
  .string()
  .regex(decimalUserIdPattern)
  .transform((value) => Number(value))
  .pipe(z.number().int().positive().max(Number.MAX_SAFE_INTEGER));

const accessTokenPayloadSchema = z
  .strictObject({
    aud: z.literal(ACCESS_TOKEN_AUDIENCE),
    exp: z.number().int(),
    iat: z.number().int(),
    iss: z.string(),
    sid: z.cuid2(),
    sub: accessTokenUserIdSchema,
    token_use: z.literal('access'),
  })
  .refine(({ exp, iat }) => exp - iat === ACCESS_TOKEN_TTL_SECONDS, {
    message: 'Access token lifetime must match the configured TTL',
    path: ['exp'],
  });

export interface AccessTokenClaims {
  sessionId: string;
  userId: number;
}

export interface RefreshCredential {
  refreshSecret: string;
  sessionId: string;
}

function decodeSecret(value: string) {
  return Buffer.from(value, 'base64url');
}

function createRefreshSecretHash(
  refreshSecret: string,
  environment: ApiEnvironment,
) {
  return createHmac(
    'sha256',
    decodeSecret(environment.AUTH_REFRESH_TOKEN_PEPPER),
  )
    .update(refreshSecret)
    .digest('base64url');
}

export function createRefreshSecret() {
  return randomBytes(32).toString('base64url');
}

export function formatRefreshCredential(credential: RefreshCredential) {
  return `${credential.sessionId}.${credential.refreshSecret}`;
}

export function parseRefreshCredential(
  value: string | undefined,
): RefreshCredential | undefined {
  if (!value) return undefined;

  const parts = value.split('.');
  if (parts.length !== 2) return undefined;

  const [sessionId, refreshSecret] = parts;
  if (
    !sessionId ||
    !refreshSecret ||
    !cuidPattern.test(sessionId) ||
    !refreshSecretPattern.test(refreshSecret)
  )
    return undefined;

  return { sessionId, refreshSecret };
}

export function hashRefreshSecret(
  refreshSecret: string,
  environment: ApiEnvironment,
) {
  return createRefreshSecretHash(refreshSecret, environment);
}

export function verifyRefreshSecret(
  refreshSecret: string,
  refreshSecretHash: string,
  environment: ApiEnvironment,
) {
  const expected = Buffer.from(
    createRefreshSecretHash(refreshSecret, environment),
  );
  const actual = Buffer.from(refreshSecretHash);
  return (
    expected.byteLength === actual.byteLength &&
    timingSafeEqual(expected, actual)
  );
}

export async function signAccessToken(
  claims: AccessTokenClaims,
  environment: ApiEnvironment,
) {
  return new SignJWT({
    sid: claims.sessionId,
    token_use: 'access',
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'at+jwt' })
    .setIssuedAt()
    .setIssuer(environment.AUTH_JWT_ISSUER)
    .setAudience(ACCESS_TOKEN_AUDIENCE)
    .setSubject(String(claims.userId))
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(decodeSecret(environment.AUTH_ACCESS_TOKEN_SECRET));
}

export async function verifyAccessToken(
  token: string,
  environment: ApiEnvironment,
): Promise<AccessTokenClaims | undefined> {
  try {
    const { payload } = await jwtVerify(
      token,
      decodeSecret(environment.AUTH_ACCESS_TOKEN_SECRET),
      {
        algorithms: ['HS256'],
        audience: ACCESS_TOKEN_AUDIENCE,
        issuer: environment.AUTH_JWT_ISSUER,
        maxTokenAge: ACCESS_TOKEN_TTL_SECONDS,
        requiredClaims: ['aud', 'exp', 'iat', 'iss', 'sid', 'sub', 'token_use'],
        typ: 'at+jwt',
      },
    );

    const parsedPayload = accessTokenPayloadSchema.safeParse(payload);
    if (!parsedPayload.success) return undefined;

    return {
      sessionId: parsedPayload.data.sid,
      userId: parsedPayload.data.sub,
    };
  } catch {
    return undefined;
  }
}

export function refreshCookieOptions(environment: ApiEnvironment) {
  return {
    httpOnly: true,
    maxAge: SESSION_TTL_SECONDS,
    path: '/auth',
    sameSite: 'Strict' as const,
    secure: environment.AUTH_COOKIE_SECURE,
  };
}
