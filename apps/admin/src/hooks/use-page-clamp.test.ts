import { describe, expect, it } from 'vitest';

import { clampPage } from './use-page-clamp';

describe('clampPage', () => {
  it('页码未越界时不钳制：有数据页、末页、第 1 页都原样通过', () => {
    expect(
      clampPage({ emptyPage: false, page: 3, pageSize: 20, total: 100 }),
    ).toEqual({ clamping: false, totalPages: 5 });
    expect(
      clampPage({ emptyPage: true, page: 5, pageSize: 20, total: 100 }),
    ).toEqual({ clamping: false, totalPages: 5 });
    expect(
      clampPage({ emptyPage: true, page: 1, pageSize: 20, total: 100 }),
    ).toEqual({ clamping: false, totalPages: 5 });
  });

  it('total 为 0（尚未加载或已全部删除）永不钳制', () => {
    expect(
      clampPage({ emptyPage: true, page: 9, pageSize: 20, total: 0 }),
    ).toEqual({ clamping: false, totalPages: 1 });
  });

  it('末页删光后越界页需钳回最后一个非空页', () => {
    expect(
      clampPage({ emptyPage: true, page: 9, pageSize: 20, total: 81 }),
    ).toEqual({ clamping: true, totalPages: 5 });
  });

  it('仅剩一页时钳回第 1 页（URL 侧以 undefined 表示）', () => {
    expect(
      clampPage({ emptyPage: true, page: 4, pageSize: 20, total: 3 }),
    ).toEqual({ clamping: true, totalPages: 1 });
  });
});
