import { describe, expect, it } from 'vitest';

import { musicSearchSchema } from './search';

describe('musicSearchSchema', () => {
  it('缺省与垃圾参数一律降级为 undefined', () => {
    expect(musicSearchSchema.parse({})).toEqual({
      search: undefined,
      incomplete: undefined,
      page: undefined,
    });
    expect(
      musicSearchSchema.parse({
        incomplete: 'true',
        page: 'bogus',
        search: '   ',
      }),
    ).toEqual({
      search: undefined,
      incomplete: undefined,
      page: undefined,
    });
  });

  it('合法参数按类型收敛：search 去空白、incomplete 为布尔、page 转数字', () => {
    expect(
      musicSearchSchema.parse({
        incomplete: true,
        page: '3',
        search: '  月光  ',
      }),
    ).toEqual({ search: '月光', incomplete: true, page: 3 });
  });

  it('page 必须是正整数，0、负数与小数降级', () => {
    expect(musicSearchSchema.parse({ page: '0' }).page).toBeUndefined();
    expect(musicSearchSchema.parse({ page: '-2' }).page).toBeUndefined();
    expect(musicSearchSchema.parse({ page: '3.5' }).page).toBeUndefined();
  });

  it('未声明的键被剥离，不进 URL 状态', () => {
    expect(
      musicSearchSchema.parse({ intruder: 'x', incomplete: true }),
    ).toEqual({ search: undefined, incomplete: true, page: undefined });
  });

  it('超长 search 按 DTO 上限降级为 undefined', () => {
    expect(
      musicSearchSchema.parse({ search: 'a'.repeat(101) }).search,
    ).toBeUndefined();
  });
});
