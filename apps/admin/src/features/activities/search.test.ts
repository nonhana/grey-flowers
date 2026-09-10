import { describe, expect, it } from 'vitest';

import { activitiesSearchSchema } from './search';

describe('activitiesSearchSchema', () => {
  it('缺省与垃圾参数一律降级为 undefined', () => {
    expect(activitiesSearchSchema.parse({})).toEqual({
      search: undefined,
      page: undefined,
    });
    expect(
      activitiesSearchSchema.parse({ page: 'bogus', search: '   ' }),
    ).toEqual({
      search: undefined,
      page: undefined,
    });
  });

  it('合法参数按类型收敛：search 去空白、page 转数字', () => {
    expect(
      activitiesSearchSchema.parse({ page: '3', search: '  花园  ' }),
    ).toEqual({ page: 3, search: '花园' });
  });

  it('page 必须是正整数，0、负数与小数降级', () => {
    expect(activitiesSearchSchema.parse({ page: '0' }).page).toBeUndefined();
    expect(activitiesSearchSchema.parse({ page: '-2' }).page).toBeUndefined();
    expect(activitiesSearchSchema.parse({ page: '3.5' }).page).toBeUndefined();
  });

  it('未声明的键被剥离，不进 URL 状态', () => {
    expect(activitiesSearchSchema.parse({ intruder: 'x', page: '2' })).toEqual({
      page: 2,
      search: undefined,
    });
  });

  it('超长 search 按 DTO 上限降级为 undefined', () => {
    expect(
      activitiesSearchSchema.parse({ search: 'a'.repeat(101) }).search,
    ).toBeUndefined();
  });
});
