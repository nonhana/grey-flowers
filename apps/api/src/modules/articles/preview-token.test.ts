import { readApiEnvironment } from '@/env.js'
import { describe, expect, it, vi } from 'vitest'

import { createPreviewToken, verifyPreviewToken } from './preview-token.js'

/** 最小开发环境：走真实解析工厂，避免 unsafe 类型断言。 */
const environment = readApiEnvironment({
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
})

describe('preview token', () => {
  it('签发后可验证并还原 articleId / revision', () => {
    const { token } = createPreviewToken(environment, 42, 7)
    const claims = verifyPreviewToken(environment, token)
    expect(claims).toBeDefined()
    if (claims) {
      expect(claims.articleId).toBe(42)
      expect(claims.revision).toBe(7)
      expect(typeof claims.exp).toBe('number')
    }
  })

  it('过期 token 验证失败', () => {
    vi.useFakeTimers()
    try {
      // 签发在 now，窗口 15 分钟
      const { token } = createPreviewToken(environment, 1, 0)
      vi.setSystemTime(Date.now() + 16 * 60 * 1000)
      expect(verifyPreviewToken(environment, token)).toBeUndefined()
    }
    finally {
      vi.useRealTimers()
    }
  })

  it('篡改后的 token 验证失败', () => {
    const { token } = createPreviewToken(environment, 42, 7)
    const [payload] = token.split('.')
    // 用同一 payload、错误签名：必失败
    expect(verifyPreviewToken(environment, `${payload}.AAAA`)).toBeUndefined()
    expect(verifyPreviewToken(environment, 'garbage')).toBeUndefined()
    expect(verifyPreviewToken(environment, '')).toBeUndefined()
  })
})
