import { describe, expect, it } from 'vitest';

import { usersSearchSchema } from './search';

describe('usersSearchSchema', () => {
  it('缺省与垃圾参数一律降级为 undefined', () => {
    expect(usersSearchSchema.parse({})).toEqual({
      search: undefined,
      role: undefined,
      page: undefined,
    });
    expect(
      usersSearchSchema.parse({ page: 'bogus', search: '   ', role: 'nope' }),
    ).toEqual({
      search: undefined,
      role: undefined,
      page: undefined,
    });
  });

  it('合法参数按类型收敛：role 限枚举、search 去空白、page 转数字', () => {
    expect(
      usersSearchSchema.parse({ page: '3', search: '  花园  ', role: 'ADMIN' }),
    ).toEqual({ page: 3, search: '花园', role: 'ADMIN' });
  });

  it('page 必须是正整数，0、负数与小数降级', () => {
    expect(usersSearchSchema.parse({ page: '0' }).page).toBeUndefined();
    expect(usersSearchSchema.parse({ page: '-2' }).page).toBeUndefined();
    expect(usersSearchSchema.parse({ page: '3.5' }).page).toBeUndefined();
  });

  it('未声明的键被剥离，不进 URL 状态', () => {
    expect(usersSearchSchema.parse({ intruder: 'x', role: 'USER' })).toEqual({
      page: undefined,
      search: undefined,
      role: 'USER',
    });
  });

  it('超长 search 按 DTO 上限降级为 undefined', () => {
    expect(
      usersSearchSchema.parse({ search: 'a'.repeat(101) }).search,
    ).toBeUndefined();
  });
});
