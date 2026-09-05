import { describe, expect, it } from 'vitest';

import { resolveClientIp, UNKNOWN_CLIENT_IP } from './client-ip';

describe('resolveClientIp · 无可信反代（hops = 0）', () => {
  it('完全忽略 X-Forwarded-For，只认 socket 对端地址', () => {
    expect(
      resolveClientIp({
        forwardedFor: '1.2.3.4',
        remoteAddress: '203.0.113.9',
        trustedProxyHops: 0,
      }),
    ).toBe('203.0.113.9');
  });

  it('对端地址缺失时退到占位 key', () => {
    expect(
      resolveClientIp({
        forwardedFor: '1.2.3.4',
        remoteAddress: undefined,
        trustedProxyHops: 0,
      }),
    ).toBe(UNKNOWN_CLIENT_IP);
  });
});

describe('resolveClientIp · 单层可信反代（hops = 1）', () => {
  it('取末段 —— 即反代追加的真实对端', () => {
    expect(
      resolveClientIp({
        forwardedFor: '203.0.113.9',
        remoteAddress: '127.0.0.1',
        trustedProxyHops: 1,
      }),
    ).toBe('203.0.113.9');
  });

  it('客户端伪造的首段拿不到限流 key', () => {
    // 客户端自带 XFF: 9.9.9.9，nginx 追加真实对端 203.0.113.9
    expect(
      resolveClientIp({
        forwardedFor: '9.9.9.9, 203.0.113.9',
        remoteAddress: '127.0.0.1',
        trustedProxyHops: 1,
      }),
    ).toBe('203.0.113.9');
  });

  it('伪造整条链路也只能撞到自己的真实对端', () => {
    expect(
      resolveClientIp({
        forwardedFor: '1.1.1.1, 2.2.2.2, 3.3.3.3, 203.0.113.9',
        remoteAddress: '127.0.0.1',
        trustedProxyHops: 1,
      }),
    ).toBe('203.0.113.9');
  });

  it('反代未写 XFF 时退到 socket 对端地址', () => {
    expect(
      resolveClientIp({
        forwardedFor: undefined,
        remoteAddress: '127.0.0.1',
        trustedProxyHops: 1,
      }),
    ).toBe('127.0.0.1');
  });

  it('空白/空段被剔除，不会产出空 key', () => {
    expect(
      resolveClientIp({
        forwardedFor: ' , , 203.0.113.9 , ',
        remoteAddress: '127.0.0.1',
        trustedProxyHops: 1,
      }),
    ).toBe('203.0.113.9');
  });
});

describe('resolveClientIp · 多层可信反代（hops = 2）', () => {
  it('跳过 CDN 边缘节点，取客户端地址', () => {
    // 客户端 → CDN(记 203.0.113.9) → nginx(追加 CDN 边缘 198.51.100.7)
    expect(
      resolveClientIp({
        forwardedFor: '203.0.113.9, 198.51.100.7',
        remoteAddress: '127.0.0.1',
        trustedProxyHops: 2,
      }),
    ).toBe('203.0.113.9');
  });

  it('链路短于配置跳数时无法定位客户端，回退可信对端', () => {
    expect(
      resolveClientIp({
        forwardedFor: '203.0.113.9',
        remoteAddress: '127.0.0.1',
        trustedProxyHops: 2,
      }),
    ).toBe('127.0.0.1');
  });
});
