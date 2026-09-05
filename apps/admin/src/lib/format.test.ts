import { describe, expect, it } from 'vitest';

import {
  formatBytes,
  formatCount,
  formatDuration,
  formatDurationMs,
  formatHours,
} from './format';

describe('formatBytes', () => {
  it('1024 以下按字节原样显示', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1023)).toBe('1023 B');
  });

  it('逐级进位到 KB / MB / GB', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(1024 ** 2)).toBe('1.0 MB');
    expect(formatBytes(1024 ** 3)).toBe('1.0 GB');
  });

  it('三位数以上省掉小数位，避免元数据行被撑开', () => {
    expect(formatBytes(200 * 1024)).toBe('200 KB');
  });

  it('超过 GB 不再进位（单位表到 GB 为止）', () => {
    expect(formatBytes(2 * 1024 ** 4)).toBe('2048 GB');
  });
});

describe('formatDurationMs / formatDuration', () => {
  it('毫秒按 mm:ss 输出，秒位补零', () => {
    expect(formatDurationMs(5000)).toBe('0:05');
    expect(formatDurationMs(65_000)).toBe('1:05');
    expect(formatDurationMs(3_600_000)).toBe('60:00');
  });

  it('非有限值与非正值一律 0:00', () => {
    expect(formatDurationMs(0)).toBe('0:00');
    expect(formatDurationMs(-1)).toBe('0:00');
    expect(formatDurationMs(Number.NaN)).toBe('0:00');
    expect(formatDurationMs(Number.POSITIVE_INFINITY)).toBe('0:00');
  });

  it('秒版本与毫秒版本口径一致', () => {
    expect(formatDuration(65)).toBe(formatDurationMs(65_000));
  });
});

describe('formatCount', () => {
  it('一万以下原样', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(9999)).toBe('9999');
  });

  it('一万以上折算为「万」，保留一位小数', () => {
    expect(formatCount(10_000)).toBe('1.0 万');
    expect(formatCount(972_384)).toBe('97.2 万');
  });

  it('百万以上省掉小数位', () => {
    expect(formatCount(1_000_000)).toBe('100 万');
  });
});

describe('formatHours', () => {
  it('不足一小时按分钟读', () => {
    expect(formatHours(0)).toBe('0 分钟');
    expect(formatHours(3599)).toBe('60 分钟');
  });

  it('一小时以上按小时读，保留一位小数', () => {
    expect(formatHours(3600)).toBe('1.0 小时');
    expect(formatHours(95_100)).toBe('26.4 小时');
  });

  it('百小时以上省掉小数位', () => {
    expect(formatHours(360_000)).toBe('100 小时');
  });
});
