import { describe, expect, it } from 'vitest';

import { articlesSearchSchema } from './display';

describe('articlesSearchSchema', () => {
  it('缺省与垃圾参数一律降级为 undefined', () => {
    expect(articlesSearchSchema.parse({})).toEqual({
      status: undefined,
      q: undefined,
      page: undefined,
    });
    expect(
      articlesSearchSchema.parse({ page: 'bogus', q: '   ', status: 'nope' }),
    ).toEqual({
      status: undefined,
      q: undefined,
      page: undefined,
    });
  });

  it('合法参数按类型收敛：status 限枚举、q 去空白、page 转数字', () => {
    expect(
      articlesSearchSchema.parse({ page: '3', q: '  花园  ', status: 'draft' }),
    ).toEqual({ page: 3, q: '花园', status: 'draft' });
  });

  it('page 必须是正整数，0、负数与小数降级', () => {
    expect(articlesSearchSchema.parse({ page: '0' }).page).toBeUndefined();
    expect(articlesSearchSchema.parse({ page: '-2' }).page).toBeUndefined();
    expect(articlesSearchSchema.parse({ page: '3.5' }).page).toBeUndefined();
  });

  it('未声明的键被剥离，不进 URL 状态', () => {
    expect(
      articlesSearchSchema.parse({ intruder: 'x', status: 'draft' }),
    ).toEqual({ page: undefined, q: undefined, status: 'draft' });
  });

  it('超长 q 按 DTO 上限降级为 undefined', () => {
    expect(
      articlesSearchSchema.parse({ q: 'a'.repeat(201) }).q,
    ).toBeUndefined();
  });
});
