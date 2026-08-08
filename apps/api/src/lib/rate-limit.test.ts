import { describe, expect, it } from 'vitest'

import { createRateLimiter } from './rate-limit.js'

describe('createRateLimiter', () => {
  it('允许窗口内的请求，超出上限后拒绝同一 key', () => {
    const clock = 0
    const limiter = createRateLimiter({ windowMs: 1000, max: 3, now: () => clock })

    expect(limiter.check('ip:1')).toBe(true)
    expect(limiter.check('ip:1')).toBe(true)
    expect(limiter.check('ip:1')).toBe(true)
    // 第 4 次撞到窗口上限
    expect(limiter.check('ip:1')).toBe(false)
  })

  it('不同 key 互不影响', () => {
    const clock = 0
    const limiter = createRateLimiter({ windowMs: 1000, max: 1, now: () => clock })

    expect(limiter.check('ip:a')).toBe(true)
    expect(limiter.check('ip:b')).toBe(true)
    expect(limiter.check('ip:a')).toBe(false)
  })

  it('窗口滑动后配额恢复', () => {
    let clock = 0
    const limiter = createRateLimiter({ windowMs: 1000, max: 2, now: () => clock })

    expect(limiter.check('k')).toBe(true)
    expect(limiter.check('k')).toBe(true)
    expect(limiter.check('k')).toBe(false)

    clock += 1001
    expect(limiter.check('k')).toBe(true)
  })

  it('窗口内交错的过期时间戳会被清理，不残留计数', () => {
    let clock = 0
    const limiter = createRateLimiter({ windowMs: 1000, max: 2, now: () => clock })

    // t=0 打两次，窗口满
    expect(limiter.check('k')).toBe(true)
    expect(limiter.check('k')).toBe(true)
    // t=600：最旧时间戳仍在窗内
    clock = 600
    expect(limiter.check('k')).toBe(false)
    // t=1500：最旧时间戳（t=0）滑出窗口，只剩 t=600 一个
    clock = 1500
    expect(limiter.check('k')).toBe(true)
  })
})
