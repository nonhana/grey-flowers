import { createHmac, timingSafeEqual } from 'node:crypto';

import type { ApiEnvironment } from '@/env';

const PREVIEW_TYPE = 'preview';
export const PREVIEW_TTL_SECONDS = 15 * 60;

interface PreviewClaims {
  articleId: number;
  exp: number;
  revision: number;
}

const derivationKey = (environment: ApiEnvironment) => {
  return createHmac(
    'sha256',
    Buffer.from(environment.AUTH_ACCESS_TOKEN_SECRET, 'base64url'),
  )
    .update('grey-flowers:preview-token:1')
    .digest();
};

const sign = (payload: string, key: Buffer) => {
  return createHmac('sha256', key).update(payload).digest('base64url');
};

export const createPreviewToken = (
  environment: ApiEnvironment,
  articleId: number,
  revision: number,
): { token: string; expiresIn: number } => {
  const issuedAt = Math.floor(Date.now() / 1000);
  const claims = {
    exp: issuedAt + PREVIEW_TTL_SECONDS,
    iat: issuedAt,
    rev: revision,
    sub: articleId,
    typ: PREVIEW_TYPE,
  };
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const key = derivationKey(environment);
  return {
    token: `${payload}.${sign(payload, key)}`,
    expiresIn: PREVIEW_TTL_SECONDS,
  };
};

export const verifyPreviewToken = (
  environment: ApiEnvironment,
  token: string,
): PreviewClaims | undefined => {
  const parts = token.split('.');
  if (parts.length !== 2) return undefined;
  const [payload, signature] = parts;

  const key = derivationKey(environment);
  const expected = Buffer.from(sign(payload, key), 'base64url');
  const actual = Buffer.from(signature, 'base64url');
  if (
    expected.byteLength !== actual.byteLength ||
    !timingSafeEqual(expected, actual)
  )
    return undefined;

  try {
    const claims = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as {
      exp?: unknown;
      rev?: unknown;
      sub?: unknown;
      typ?: unknown;
    };

    if (
      claims.typ !== PREVIEW_TYPE ||
      typeof claims.sub !== 'number' ||
      typeof claims.rev !== 'number' ||
      typeof claims.exp !== 'number'
    )
      return undefined;
    if (claims.exp < Math.floor(Date.now() / 1000)) return undefined;

    return {
      articleId: claims.sub,
      exp: claims.exp,
      revision: claims.rev,
    };
  } catch {
    return undefined;
  }
};
