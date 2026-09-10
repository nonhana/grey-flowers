import { describe, expect, it } from 'vitest';

import { assetsSearchSchema } from './display';

describe('assetsSearchSchema', () => {
  it('缺省与垃圾参数一律降级为 undefined', () => {
    expect(assetsSearchSchema.parse({})).toEqual({
      status: undefined,
      mediaType: undefined,
      purpose: undefined,
      page: undefined,
    });
    expect(
      assetsSearchSchema.parse({
        page: 'bogus',
        status: 'DELETED',
        mediaType: 'VIDEO',
        purpose: 'nope',
      }),
    ).toEqual({
      status: undefined,
      mediaType: undefined,
      purpose: undefined,
      page: undefined,
    });
  });

  it('合法参数按类型收敛：枚举限值、page 转数字', () => {
    expect(
      assetsSearchSchema.parse({
        page: '3',
        status: 'AVAILABLE',
        mediaType: 'IMAGE',
        purpose: 'ARTICLE_COVER',
      }),
    ).toEqual({
      page: 3,
      status: 'AVAILABLE',
      mediaType: 'IMAGE',
      purpose: 'ARTICLE_COVER',
    });
  });

  it('status 限可选两值，DELETED 降级', () => {
    expect(
      assetsSearchSchema.parse({ status: 'DELETED' }).status,
    ).toBeUndefined();
  });

  it('page 必须是正整数，0、负数与小数降级', () => {
    expect(assetsSearchSchema.parse({ page: '0' }).page).toBeUndefined();
    expect(assetsSearchSchema.parse({ page: '-2' }).page).toBeUndefined();
    expect(assetsSearchSchema.parse({ page: '3.5' }).page).toBeUndefined();
  });

  it('未声明的键被剥离，不进 URL 状态', () => {
    expect(
      assetsSearchSchema.parse({ intruder: 'x', mediaType: 'AUDIO' }),
    ).toEqual({
      status: undefined,
      mediaType: 'AUDIO',
      purpose: undefined,
      page: undefined,
    });
  });
});
