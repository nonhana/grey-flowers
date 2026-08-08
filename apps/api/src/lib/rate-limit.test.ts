import { describe, expect, it } from 'vitest';

import { createRateLimiter } from './rate-limit.js';

describe('createRateLimiter', () => {
  it('允许窗口内的请求，超出上限后拒绝同一 key', () => {
    const clock = 0;
    const limiter = createRateLimiter({
      windowMs: 1000,
      max: 3,
      now: () => clock,
    });

    expect(limiter.check('ip:1')).toBe(true);
    expect(limiter.check('ip:1')).toBe(true);
    expect(limiter.check('ip:1')).toBe(true);
    // 第 4 次撞到窗口上限
    expect(limiter.check('ip:1')).toBe(false);
  });

  it('不同 key 互不影响', () => {
    const clock = 0;
    const limiter = createRateLimiter({
      windowMs: 1000,
      max: 1,
      now: () => clock,
    });

    expect(limiter.check('ip:a')).toBe(true);
    expect(limiter.check('ip:b')).toBe(true);
    expect(limiter.check('ip:a')).toBe(false);
  });

  it('窗口滑动后配额恢复', () => {
    let clock = 0;
    const limiter = createRateLimiter({
      windowMs: 1000,
      max: 2,
      now: () => clock,
    });

    expect(limiter.check('k')).toBe(true);
    expect(limiter.check('k')).toBe(true);
    expect(limiter.check('k')).toBe(false);

    clock += 1001;
    expect(limiter.check('k')).toBe(true);
  });

  it('窗口内交错的过期时间戳会被清理，不残留计数', () => {
    let clock = 0;
    const limiter = createRateLimiter({
      windowMs: 1000,
      max: 2,
      now: () => clock,
    });

    // t=0 打两次，窗口满
    expect(limiter.check('k')).toBe(true);
    expect(limiter.check('k')).toBe(true);
    // t=600：最旧时间戳仍在窗内
    clock = 600;
    expect(limiter.check('k')).toBe(false);
    // t=1500：最旧时间戳（t=0）滑出窗口，只剩 t=600 一个
    clock = 1500;
    expect(limiter.check('k')).toBe(true);
  });
});

describe('createRateLimiter · key 数量上界', () => {
  it('随机 key 洪泛不会让追踪表无限增长', () => {
    const clock = 0;
    const limiter = createRateLimiter({
      windowMs: 1000,
      max: 5,
      maxKeys: 16,
      now: () => clock,
    });

    for (let index = 0; index < 5000; index += 1)
      limiter.check(`ip:forged-${index}`);

    expect(limiter.size()).toBe(16);
  });

  it('回收优先丢整窗过期的 key，活跃 key 的配额守得住', () => {
    let clock = 0;
    const limiter = createRateLimiter({
      windowMs: 1000,
      max: 1,
      maxKeys: 2,
      now: () => clock,
    });

    expect(limiter.check('stale')).toBe(true);
    // t=2000：stale 整窗过期，hot 起一次把配额用满
    clock = 2000;
    expect(limiter.check('hot')).toBe(true);
    // fresh 撞上界 → 只丢过期的 stale，hot 留在表内
    expect(limiter.check('fresh')).toBe(true);
    expect(limiter.size()).toBe(2);
    expect(limiter.check('hot')).toBe(false);
  });

  it('无过期 key 可丢时按 LRU 淘汰最久未访问的 key', () => {
    const clock = 0;
    const limiter = createRateLimiter({
      windowMs: 1000,
      max: 1,
      maxKeys: 2,
      now: () => clock,
    });

    expect(limiter.check('a')).toBe(true);
    expect(limiter.check('b')).toBe(true);
    // c 撞上界，无过期项 → 淘汰最久未访问的 a
    expect(limiter.check('c')).toBe(true);
    expect(limiter.size()).toBe(2);
    // b 仍在表内，配额已耗尽
    expect(limiter.check('b')).toBe(false);
    // a 已被淘汰，计数丢失 —— 这是有界内存的可观察代价
    expect(limiter.check('a')).toBe(true);
  });
});
