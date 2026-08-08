import { describe, expect, it } from 'vitest';

import { decideRefresh, REFRESH_REUSE_GRACE_MS } from './refresh-policy.js';

const NOW = Date.parse('2026-08-08T12:00:00.000Z');

const decide = (overrides: Partial<Parameters<typeof decideRefresh>[0]> = {}) =>
  decideRefresh({
    lastRotatedAt: new Date(NOW),
    matchesCurrentSecret: false,
    matchesPreviousSecret: false,
    now: NOW,
    ...overrides,
  });

describe('decideRefresh', () => {
  it('当前 secret 命中即正常轮换', () => {
    expect(decide({ matchesCurrentSecret: true })).toBe('rotate');
  });

  it('两个 hash 都对不上 → 拒绝，但不吊销任何会话', () => {
    expect(decide()).toBe('reject');
  });

  it('宽限窗口内的旧 credential 视为在途重试，照常轮换', () => {
    // 并发双 refresh：后到的那个还带着轮换前的 credential
    expect(
      decide({
        matchesPreviousSecret: true,
        now: NOW + 1000,
      }),
    ).toBe('rotate');
  });

  it('宽限窗口边界（恰好等于窗口长度）仍按在途重试放行', () => {
    expect(
      decide({
        matchesPreviousSecret: true,
        now: NOW + REFRESH_REUSE_GRACE_MS,
      }),
    ).toBe('rotate');
  });

  it('超出宽限窗口的旧 credential 判定为重放 → 全族吊销', () => {
    expect(
      decide({
        matchesPreviousSecret: true,
        now: NOW + REFRESH_REUSE_GRACE_MS + 1,
      }),
    ).toBe('reuse-detected');
  });

  it('几小时后再拿旧 credential 回来一定是重放', () => {
    expect(
      decide({
        matchesPreviousSecret: true,
        now: NOW + 6 * 60 * 60 * 1000,
      }),
    ).toBe('reuse-detected');
  });

  it('宽限窗口不因时钟回拨而失效（负差值仍在窗口内）', () => {
    expect(
      decide({
        matchesPreviousSecret: true,
        now: NOW - 5000,
      }),
    ).toBe('rotate');
  });
});
