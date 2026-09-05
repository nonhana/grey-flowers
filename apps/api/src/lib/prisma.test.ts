import { Prisma } from '@grey-flowers/db';
import { describe, expect, it } from 'vitest';

import { isRecordNotFound, isUniqueConstraint } from './prisma';

const knownError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('boom', {
    code,
    clientVersion: '7.9.1',
  });

describe('isUniqueConstraint', () => {
  it('识别 Prisma P2002', () => {
    expect(isUniqueConstraint(knownError('P2002'))).toBe(true);
  });

  it('其他错误码、异类对象与非对象一律不误判', () => {
    expect(isUniqueConstraint(knownError('P2025'))).toBe(false);
    expect(isUniqueConstraint(knownError('P2003'))).toBe(false);
    expect(isUniqueConstraint({ code: 'P2002' })).toBe(false);
    expect(isUniqueConstraint(new Error('boom'))).toBe(false);
    expect(isUniqueConstraint(null)).toBe(false);
    expect(isUniqueConstraint(undefined)).toBe(false);
    expect(isUniqueConstraint('P2002')).toBe(false);
  });
});

describe('isRecordNotFound', () => {
  it('识别 Prisma P2025（乐观锁 where 未命中走这条）', () => {
    expect(isRecordNotFound(knownError('P2025'))).toBe(true);
  });

  it('其他错误码、非已知请求错误与非对象一律不误判', () => {
    expect(isRecordNotFound(knownError('P2002'))).toBe(false);
    expect(isRecordNotFound(knownError('P2023'))).toBe(false);
    expect(
      isRecordNotFound(
        new Prisma.PrismaClientValidationError('boom', {
          clientVersion: '7.9.1',
        }),
      ),
    ).toBe(false);
    expect(
      isRecordNotFound(
        new Prisma.PrismaClientUnknownRequestError('boom', {
          clientVersion: '7.9.1',
        }),
      ),
    ).toBe(false);
    expect(isRecordNotFound({ code: 'P2025' })).toBe(false);
    expect(isRecordNotFound(new Error('boom'))).toBe(false);
    expect(isRecordNotFound(null)).toBe(false);
  });
});
