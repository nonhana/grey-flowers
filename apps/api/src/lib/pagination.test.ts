import { describe, expect, it } from 'vitest';

import { pagination } from './pagination.js';

describe('pagination', () => {
  it('第一页不跳过任何行', () => {
    expect(pagination(1, 10)).toStrictEqual({ skip: 0, take: 10 });
  });

  it('第 N 页跳过前 (N-1) * pageSize 行', () => {
    expect(pagination(3, 20)).toStrictEqual({ skip: 40, take: 20 });
  });

  it('pageSize 原样作为 take，不做二次夹取（上界由 contracts 校验）', () => {
    expect(pagination(2, 1)).toStrictEqual({ skip: 1, take: 1 });
  });
});
