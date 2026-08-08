import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { ApiError } from '@/http/errors.js';

import { parseBody, parseId, parseQuery } from './parser.js';

const schema = z.strictObject({ title: z.string().min(1) });

const jsonRequest = (body: string) =>
  new Request('http://localhost/probe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

describe('parseBody', () => {
  it('合法 JSON 按 schema 解析出强类型数据', async () => {
    await expect(
      parseBody(jsonRequest('{"title":"ok"}'), schema),
    ).resolves.toStrictEqual({ title: 'ok' });
  });

  it('body 不是 JSON 时报 VALIDATION_FAILED 而非 500', async () => {
    await expect(
      parseBody(jsonRequest('not json'), schema),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });

  it('schema 不通过时带上字段级报错', async () => {
    const failure = await parseBody(jsonRequest('{"title":""}'), schema).catch(
      (error: unknown) => error,
    );

    expect(failure).toBeInstanceOf(ApiError);
    expect((failure as ApiError).code).toBe('VALIDATION_FAILED');
    expect((failure as ApiError).fields?.title?.length).toBeGreaterThan(0);
  });
});

describe('parseQuery', () => {
  it('按 schema 解析查询串', () => {
    expect(parseQuery({ title: 'ok' }, schema)).toStrictEqual({ title: 'ok' });
  });

  it('多余的查询键被 strictObject 拒绝', () => {
    expect(() => parseQuery({ title: 'ok', extra: '1' }, schema)).toThrow(
      ApiError,
    );
  });
});

describe('parseId', () => {
  it('接受正整数字符串', () => {
    expect(parseId('1')).toBe(1);
    expect(parseId('4096')).toBe(4096);
  });

  it('拒绝 0 / 负数 / 小数 / 非数字 / 缺省', () => {
    for (const value of ['0', '-1', '1.5', 'abc', '', undefined])
      expect(() => parseId(value)).toThrow(ApiError);
  });
});
