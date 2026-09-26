import { friendCreateInputSchema } from '@grey-flowers/contracts';
import { describe, expect, it } from 'vitest';

import { parseLinkJson } from './link-json';

const SAMPLE = JSON.stringify({
  color: '#858585',
  desc: '『灰色的花，终有一天会盛开吧。』',
  image: 'https://static-r2.caelum.moe/avatar.webp',
  owner: 'non_hana',
  site: 'Greyflowers',
  url: 'https://caelum.moe',
});

describe('parseLinkJson', () => {
  it('解析合法 JSON，desc 作为 description 别名，color 缺省为空串', () => {
    const result = parseLinkJson(
      JSON.stringify({ ...JSON.parse(SAMPLE), color: undefined }),
      friendCreateInputSchema,
    );
    expect(result).toEqual({
      form: {
        color: '',
        description: '『灰色的花，终有一天会盛开吧。』',
        image: 'https://static-r2.caelum.moe/avatar.webp',
        owner: 'non_hana',
        site: 'Greyflowers',
        url: 'https://caelum.moe',
      },
      ok: true,
    });
  });

  it('description 同时给出 desc 时优先 description', () => {
    const result = parseLinkJson(
      JSON.stringify({ ...JSON.parse(SAMPLE), description: '新的描述' }),
      friendCreateInputSchema,
    );
    expect(result.ok && result.form.description).toBe('新的描述');
  });

  it('非法 JSON 返回错误', () => {
    const result = parseLinkJson('{site:}', friendCreateInputSchema);
    expect(result).toMatchObject({ error: '不是合法的 JSON。', ok: false });
  });

  it('数组与标量返回错误', () => {
    expect(parseLinkJson('[]', friendCreateInputSchema)).toMatchObject({
      ok: false,
    });
    expect(parseLinkJson('"text"', friendCreateInputSchema)).toMatchObject({
      ok: false,
    });
  });

  it('缺失必填字段时逐个列出', () => {
    const result = parseLinkJson('{"site":"x"}', friendCreateInputSchema);
    expect(result).toMatchObject({
      error: 'JSON 缺少字段：「description」、「image」、「owner」、「url」',
      ok: false,
    });
  });

  it('字段值不合法返回首个校验消息', () => {
    const result = parseLinkJson(
      JSON.stringify({
        description: 'd',
        image: 'https://a.b/c.png',
        owner: 'o',
        site: 's',
        url: 'not-a-url',
      }),
      friendCreateInputSchema,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('URL');
  });

  it('颜色格式不合法返回校验消息', () => {
    const result = parseLinkJson(
      JSON.stringify({ ...JSON.parse(SAMPLE), color: 'blue' }),
      friendCreateInputSchema,
    );
    expect(result).toMatchObject({
      error: '颜色需为 #RRGGBB 格式',
      ok: false,
    });
  });

  it('忽略多余键', () => {
    const result = parseLinkJson(
      JSON.stringify({ ...JSON.parse(SAMPLE), extra: 1 }),
      friendCreateInputSchema,
    );
    expect(result.ok).toBe(true);
  });
});
