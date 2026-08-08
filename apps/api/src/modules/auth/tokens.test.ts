import { Buffer } from 'node:buffer';
import { describe, expect, it } from 'vitest';

import { createTestEnvironment } from '@/testing/environment.js';

import {
  ACCESS_TOKEN_AUDIENCE,
  createRefreshSecret,
  formatRefreshCredential,
  hashRefreshSecret,
  parseRefreshCredential,
  refreshCookieOptions,
  SESSION_TTL_SECONDS,
  signAccessToken,
  verifyAccessToken,
  verifyRefreshSecret,
} from './tokens.js';

const environment = createTestEnvironment();
const SESSION_ID = 'c'.padEnd(25, 'a');

describe('refresh credential · 格式与往返', () => {
  it('format → parse 往返还原 sessionId 与 secret', () => {
    const refreshSecret = createRefreshSecret();
    const credential = formatRefreshCredential({
      sessionId: SESSION_ID,
      refreshSecret,
    });

    expect(parseRefreshCredential(credential)).toStrictEqual({
      sessionId: SESSION_ID,
      refreshSecret,
    });
  });

  it('随机 secret 是 43 字符 base64url（32 字节）', () => {
    expect(createRefreshSecret()).toMatch(/^[A-Za-z0-9_-]{43}$/);
    // 两次签发不应相同
    expect(createRefreshSecret()).not.toBe(createRefreshSecret());
  });

  it('形状不合规的 credential 一律拒绝，不进 DB 查询', () => {
    const valid = createRefreshSecret();
    expect(parseRefreshCredential(undefined)).toBeUndefined();
    expect(parseRefreshCredential('')).toBeUndefined();
    // 缺分隔符 / 多段
    expect(parseRefreshCredential(SESSION_ID)).toBeUndefined();
    expect(parseRefreshCredential(`${SESSION_ID}.${valid}.x`)).toBeUndefined();
    // sessionId 不是 cuid
    expect(parseRefreshCredential(`not-a-cuid.${valid}`)).toBeUndefined();
    // secret 长度不对
    expect(parseRefreshCredential(`${SESSION_ID}.short`)).toBeUndefined();
    // secret 含非 base64url 字符
    expect(
      parseRefreshCredential(`${SESSION_ID}.${'+'.repeat(43)}`),
    ).toBeUndefined();
  });
});

describe('refresh secret · hash 与校验', () => {
  it('同一 secret 得到稳定 hash，不同 secret 不碰撞', () => {
    const secret = createRefreshSecret();
    const hash = hashRefreshSecret(secret, environment);

    expect(hashRefreshSecret(secret, environment)).toBe(hash);
    expect(hashRefreshSecret(createRefreshSecret(), environment)).not.toBe(
      hash,
    );
    // hash 里不得出现原始 secret
    expect(hash).not.toContain(secret);
  });

  it('换 pepper 后旧 hash 不再通过校验', () => {
    const secret = createRefreshSecret();
    const hash = hashRefreshSecret(secret, environment);
    const rotated = createTestEnvironment({
      AUTH_REFRESH_TOKEN_PEPPER: Buffer.alloc(48, 'c').toString('base64url'),
    });

    expect(verifyRefreshSecret(secret, hash, environment)).toBe(true);
    expect(verifyRefreshSecret(secret, hash, rotated)).toBe(false);
  });

  it('长度不同的 hash 直接判否，不进等时比较', () => {
    const secret = createRefreshSecret();
    expect(verifyRefreshSecret(secret, '', environment)).toBe(false);
    expect(verifyRefreshSecret(secret, 'short', environment)).toBe(false);
  });
});

describe('access token · 签发与校验', () => {
  it('签发的 token 可还原 userId / sessionId', async () => {
    const token = await signAccessToken(
      { userId: 42, sessionId: SESSION_ID },
      environment,
    );

    await expect(verifyAccessToken(token, environment)).resolves.toStrictEqual({
      userId: 42,
      sessionId: SESSION_ID,
    });
  });

  it('签名密钥不同的 token 不被接受', async () => {
    const other = createTestEnvironment({
      AUTH_ACCESS_TOKEN_SECRET: Buffer.alloc(48, 'z').toString('base64url'),
    });
    const token = await signAccessToken(
      { userId: 42, sessionId: SESSION_ID },
      other,
    );

    await expect(
      verifyAccessToken(token, environment),
    ).resolves.toBeUndefined();
  });

  it('issuer 不匹配（拿 dev token 打 prod）时拒绝', async () => {
    const production = createTestEnvironment({
      NODE_ENV: 'production',
      ADMIN_PORT: undefined,
      MAIN_PORT: undefined,
    });
    const token = await signAccessToken(
      { userId: 42, sessionId: SESSION_ID },
      environment,
    );

    // 两边 issuer 不同（localhost vs api.caelum.moe），且密钥虽同也必须拒绝
    expect(production.AUTH_JWT_ISSUER).not.toBe(environment.AUTH_JWT_ISSUER);
    await expect(verifyAccessToken(token, production)).resolves.toBeUndefined();
  });

  it('垃圾串不会抛异常，只返回 undefined', async () => {
    await expect(verifyAccessToken('', environment)).resolves.toBeUndefined();
    await expect(
      verifyAccessToken('a.b.c', environment),
    ).resolves.toBeUndefined();
    await expect(
      verifyAccessToken('garbage', environment),
    ).resolves.toBeUndefined();
  });

  it('audience 常量与 cookie 选项保持安全默认', () => {
    expect(ACCESS_TOKEN_AUDIENCE).toBe('grey-flowers-web');

    const development = refreshCookieOptions(environment);
    expect(development).toStrictEqual({
      httpOnly: true,
      maxAge: SESSION_TTL_SECONDS,
      path: '/auth',
      sameSite: 'Strict',
      secure: false,
    });

    const production = refreshCookieOptions(
      createTestEnvironment({
        NODE_ENV: 'production',
        ADMIN_PORT: undefined,
        MAIN_PORT: undefined,
      }),
    );
    expect(production.secure).toBe(true);
    expect(production.httpOnly).toBe(true);
  });
});
