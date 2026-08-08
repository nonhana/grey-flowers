import { describe, expect, it } from 'vitest';

import { isRecordNotFound, isUniqueConstraint } from './prisma.js';

describe('isUniqueConstraint', () => {
  it('识别 P2002', () => {
    expect(isUniqueConstraint({ code: 'P2002' })).toBe(true);
  });

  it('其他错误码与非对象一律不误判', () => {
    expect(isUniqueConstraint({ code: 'P2025' })).toBe(false);
    expect(isUniqueConstraint(new Error('boom'))).toBe(false);
    expect(isUniqueConstraint(null)).toBe(false);
    expect(isUniqueConstraint(undefined)).toBe(false);
    expect(isUniqueConstraint('P2002')).toBe(false);
  });
});

describe('isRecordNotFound', () => {
  it('识别 P2025（乐观锁 where 未命中走这条）', () => {
    expect(isRecordNotFound({ code: 'P2025' })).toBe(true);
  });

  it('其他错误码与非对象一律不误判', () => {
    expect(isRecordNotFound({ code: 'P2002' })).toBe(false);
    expect(isRecordNotFound(new Error('boom'))).toBe(false);
    expect(isRecordNotFound(null)).toBe(false);
  });
});
