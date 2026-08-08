import { Buffer } from 'node:buffer';

import { readApiEnvironment } from '@/env.js';

/**
 * 单测用的最小 API 环境。
 *
 * 走真实的 `readApiEnvironment` 工厂而不是 `as ApiEnvironment` 断言：
 * schema 加了必填键、改了派生逻辑，这里会立刻炸，不会留下与运行时漂移的假环境。
 */
export const baseEnvironmentInput: NodeJS.ProcessEnv = {
  NODE_ENV: 'development',
  API_PORT: '2408',
  ADMIN_PORT: '2409',
  MAIN_PORT: '2410',
  HANA_DATABASE_URL: 'postgresql://user:pass@localhost:5432/db?schema=public',
  AUTH_ACCESS_TOKEN_SECRET: Buffer.alloc(48, 'a').toString('base64url'),
  AUTH_REFRESH_TOKEN_PEPPER: Buffer.alloc(48, 'b').toString('base64url'),
  R2_ACCOUNT_ID: 'account',
  R2_ACCESS_KEY_ID: 'access',
  R2_SECRET_ACCESS_KEY: 'secret',
  R2_BUCKET_NAME: 'bucket',
  R2_PUBLIC_URL: 'https://cdn.example.com',
  HANA_MAIL_ENABLE: 'false',
};

/** 在最小环境上叠加覆盖项；传 `undefined` 可删键（模拟未配置）。 */
export const createTestEnvironment = (overrides: NodeJS.ProcessEnv = {}) => {
  const input: NodeJS.ProcessEnv = { ...baseEnvironmentInput, ...overrides };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete input[key];
  }
  return readApiEnvironment(input);
};
