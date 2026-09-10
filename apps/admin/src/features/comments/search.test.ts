import { describe, expect, it } from 'vitest';

import { commentsSearchSchema } from './search';

describe('commentsSearchSchema', () => {
  it('缺省与垃圾参数一律降级为 undefined', () => {
    expect(commentsSearchSchema.parse({})).toEqual({
      search: undefined,
      path: undefined,
      authorId: undefined,
      startDate: undefined,
      endDate: undefined,
      page: undefined,
    });
    expect(
      commentsSearchSchema.parse({
        search: '   ',
        path: '',
        authorId: 'bogus',
        startDate: 'not-a-date',
        endDate: '2026-13-01',
        page: 'bogus',
      }),
    ).toEqual({
      search: undefined,
      path: undefined,
      authorId: undefined,
      startDate: undefined,
      endDate: undefined,
      page: undefined,
    });
  });

  it('合法参数按类型收敛：search/path 去空白、authorId 与 page 转数字', () => {
    expect(
      commentsSearchSchema.parse({
        search: '  花园  ',
        path: ' /recently?id=12 ',
        authorId: '42',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        page: '3',
      }),
    ).toEqual({
      search: '花园',
      path: '/recently?id=12',
      authorId: 42,
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      page: 3,
    });
  });

  it('authorId 必须是正整数，0、负数与小数降级', () => {
    expect(
      commentsSearchSchema.parse({ authorId: '0' }).authorId,
    ).toBeUndefined();
    expect(
      commentsSearchSchema.parse({ authorId: '-3' }).authorId,
    ).toBeUndefined();
    expect(
      commentsSearchSchema.parse({ authorId: '2.5' }).authorId,
    ).toBeUndefined();
  });

  it('page 必须是正整数，0、负数与小数降级', () => {
    expect(commentsSearchSchema.parse({ page: '0' }).page).toBeUndefined();
    expect(commentsSearchSchema.parse({ page: '-2' }).page).toBeUndefined();
    expect(commentsSearchSchema.parse({ page: '3.5' }).page).toBeUndefined();
  });

  it('日期必须是合法 ISO date，越界日期降级', () => {
    expect(
      commentsSearchSchema.parse({ startDate: '2026-02-30' }).startDate,
    ).toBeUndefined();
    expect(
      commentsSearchSchema.parse({ endDate: '20260101' }).endDate,
    ).toBeUndefined();
  });

  it('未声明的键被剥离，不进 URL 状态', () => {
    expect(
      commentsSearchSchema.parse({ intruder: 'x', search: '花园' }),
    ).toEqual({
      search: '花园',
      path: undefined,
      authorId: undefined,
      startDate: undefined,
      endDate: undefined,
      page: undefined,
    });
  });
});
