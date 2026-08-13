import { Buffer } from 'node:buffer';
import { describe, expect, it, vi } from 'vitest';

import { createTestEnvironment } from '@/testing/environment.js';

import { createPreviewToken, verifyPreviewToken } from './preview-token.js';

/** 最小开发环境：走真实解析工厂，避免 unsafe 类型断言。 */
const environment = createTestEnvironment();

describe('preview token', () => {
  it('签发后可验证并还原 articleId / revision', () => {
    const { token } = createPreviewToken(environment, 42, 7);
    const claims = verifyPreviewToken(environment, token);
    expect(claims).toBeDefined();
    if (claims) {
      expect(claims.articleId).toBe(42);
      expect(claims.revision).toBe(7);
      expect(typeof claims.exp).toBe('number');
    }
  });

  it('过期 token 验证失败', () => {
    vi.useFakeTimers();
    try {
      // 签发在 now，窗口 15 分钟
      const { token } = createPreviewToken(environment, 1, 0);
      vi.setSystemTime(Date.now() + 16 * 60 * 1000);
      expect(verifyPreviewToken(environment, token)).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it('未到期的 token 在窗口边界内仍有效', () => {
    vi.useFakeTimers();
    try {
      const { token, expiresIn } = createPreviewToken(environment, 1, 0);
      expect(expiresIn).toBe(15 * 60);
      // 差 1 秒到期：仍应通过
      vi.setSystemTime(Date.now() + (expiresIn - 1) * 1000);
      expect(verifyPreviewToken(environment, token)).toBeDefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it('篡改后的 token 验证失败', () => {
    const { token } = createPreviewToken(environment, 42, 7);
    const [payload] = token.split('.');
    // 用同一 payload、错误签名：必失败
    expect(verifyPreviewToken(environment, `${payload}.AAAA`)).toBeUndefined();
    expect(verifyPreviewToken(environment, 'garbage')).toBeUndefined();
    expect(verifyPreviewToken(environment, '')).toBeUndefined();
  });

  it('改写 payload（换文章 id）后签名对不上', () => {
    const { token } = createPreviewToken(environment, 42, 7);
    const [payload, signature] = token.split('.');
    const claims = JSON.parse(
      Buffer.from(payload ?? '', 'base64url').toString('utf8'),
    ) as Record<string, unknown>;
    const forged = Buffer.from(JSON.stringify({ ...claims, sub: 43 })).toString(
      'base64url',
    );

    expect(
      verifyPreviewToken(environment, `${forged}.${signature}`),
    ).toBeUndefined();
  });

  it('换一套密钥签发的 token 不被本环境接受', () => {
    const other = createTestEnvironment({
      AUTH_ACCESS_TOKEN_SECRET: Buffer.alloc(48, 'z').toString('base64url'),
    });
    const { token } = createPreviewToken(other, 42, 7);
    expect(verifyPreviewToken(environment, token)).toBeUndefined();
    // 反向也一样：密钥不同即互不认账
    expect(
      verifyPreviewToken(other, createPreviewToken(environment, 42, 7).token),
    ).toBeUndefined();
  });
});
