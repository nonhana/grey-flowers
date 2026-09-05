import { Buffer } from 'node:buffer';
import { describe, expect, it } from 'vitest';

import { readApiEnvironment } from './env';
import {
  baseEnvironmentInput,
  createTestEnvironment,
} from './testing/environment';

describe('readApiEnvironment · 可信反代跳数', () => {
  it('development 默认 0 层：直连时一律不采信 X-Forwarded-For', () => {
    expect(createTestEnvironment().TRUSTED_PROXY_HOPS).toBe(0);
  });

  it('production 默认 1 层：nginx 终止 TLS 后转发到本进程', () => {
    const environment = createTestEnvironment({
      NODE_ENV: 'production',
      ADMIN_PORT: undefined,
      MAIN_PORT: undefined,
    });
    expect(environment.TRUSTED_PROXY_HOPS).toBe(1);
  });

  it('显式配置优先于按环境推导的缺省值', () => {
    expect(
      createTestEnvironment({ API_TRUSTED_PROXY_HOPS: '2' }).TRUSTED_PROXY_HOPS,
    ).toBe(2);
    expect(
      createTestEnvironment({ API_TRUSTED_PROXY_HOPS: '0' }).TRUSTED_PROXY_HOPS,
    ).toBe(0);
  });

  it('拒绝负数与非整数跳数', () => {
    expect(() =>
      createTestEnvironment({ API_TRUSTED_PROXY_HOPS: '-1' }),
    ).toThrow();
    expect(() =>
      createTestEnvironment({ API_TRUSTED_PROXY_HOPS: '1.5' }),
    ).toThrow();
    expect(() =>
      createTestEnvironment({ API_TRUSTED_PROXY_HOPS: 'nginx' }),
    ).toThrow();
  });
});

describe('readApiEnvironment · 邮件开关键名', () => {
  it('HANA_MAIL_ENABLE 原样透出，未配置时为 false', () => {
    expect(
      createTestEnvironment({ HANA_MAIL_ENABLE: 'true' }).HANA_MAIL_ENABLE,
    ).toBe('true');
    expect(
      createTestEnvironment({ HANA_MAIL_ENABLE: undefined }).HANA_MAIL_ENABLE,
    ).toBe('false');
  });

  it('非 true/false 的取值直接拒绝，不静默降级', () => {
    expect(() => createTestEnvironment({ HANA_MAIL_ENABLE: '1' })).toThrow();
  });
});

describe('readApiEnvironment · 密钥校验', () => {
  it('access secret 与 refresh pepper 不得相同', () => {
    const shared = Buffer.alloc(48, 'a').toString('base64url');
    expect(() =>
      createTestEnvironment({
        AUTH_ACCESS_TOKEN_SECRET: shared,
        AUTH_REFRESH_TOKEN_PEPPER: shared,
      }),
    ).toThrow(/must differ/);
  });

  it('密钥必须是 base64url 且解码后至少 32 字节', () => {
    expect(() =>
      createTestEnvironment({
        AUTH_ACCESS_TOKEN_SECRET: Buffer.alloc(16, 'a').toString('base64url'),
      }),
    ).toThrow(/at least 32 bytes/);
    expect(() =>
      createTestEnvironment({
        AUTH_ACCESS_TOKEN_SECRET: 'not+base64url/value=',
      }),
    ).toThrow(/base64url/);
  });

  it('缺键即启动失败，不允许跑在半配置状态上', () => {
    const { HANA_DATABASE_URL: _omitted, ...withoutDatabase } =
      baseEnvironmentInput;
    expect(() => readApiEnvironment(withoutDatabase)).toThrow();
  });
});

describe('readApiEnvironment · 派生项', () => {
  it('development 派生本地 origin 与非 secure cookie', () => {
    const environment = createTestEnvironment();
    expect(environment.AUTH_COOKIE_SECURE).toBe(false);
    expect(environment.AUTH_ALLOWED_ORIGINS).toStrictEqual([
      'http://localhost:2410',
      'http://localhost:2409',
    ]);
    expect(environment.AUTH_JWT_ISSUER).toBe('http://localhost:2408');
  });

  it('production 派生线上 origin 与 secure cookie', () => {
    const environment = createTestEnvironment({
      NODE_ENV: 'production',
      ADMIN_PORT: undefined,
      MAIN_PORT: undefined,
    });
    expect(environment.AUTH_COOKIE_SECURE).toBe(true);
    expect(environment.AUTH_ALLOWED_ORIGINS).toStrictEqual([
      'https://caelum.moe',
      'https://admin.caelum.moe',
    ]);
    expect(environment.AUTH_JWT_ISSUER).toBe('https://api.caelum.moe');
  });

  it('R2 端点由 account id 派生，公开地址即 R2_PUBLIC_URL', () => {
    const environment = createTestEnvironment();
    expect(environment.R2_ENDPOINT).toBe(
      'https://account.r2.cloudflarestorage.com',
    );
    expect(environment.R2_REGION).toBe('auto');
    expect(environment.ASSET_PUBLIC_URL).toBe('https://cdn.example.com');
  });
});
