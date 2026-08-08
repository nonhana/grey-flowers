import { describe, expect, it } from 'vitest';

import { normalizeArticleTo, slugifyTitle } from './slug.js';

describe('slugifyTitle', () => {
  it('中文标题转写为拼音 slug', () => {
    expect(slugifyTitle('灰色花园')).toBe('hui-se-hua-yuan');
  });

  it('英文与数字段保持原样并小写', () => {
    expect(slugifyTitle('Hello World 2026')).toBe('hello-world-2026');
  });

  it('中英混排各段都保留', () => {
    const slug = slugifyTitle('用 Nuxt 4 重写博客');
    expect(slug).toContain('nuxt');
    expect(slug).toContain('4');
    expect(slug).toMatch(/^[a-z0-9-]+$/);
  });

  it('标点与空白收敛为单个连字符，首尾不留', () => {
    const slug = slugifyTitle('  Hello,   World!!! ---  ');
    expect(slug).toBe('hello-world');
  });

  it('纯标点标题回退到带日期的占位 slug，绝不为空', () => {
    const slug = slugifyTitle('！！！???');
    expect(slug).toMatch(/^article-\d{4}-\d{2}-\d{2}$/);
  });

  it('产物永远只含小写字母/数字/连字符', () => {
    for (const title of ['Émoji 🎉 标题', 'C++ 与 Rust', '  ', '2026/08/08'])
      expect(slugifyTitle(title)).toMatch(/^[a-z0-9-]+$/);
  });
});

describe('normalizeArticleTo', () => {
  it('裸 slug 补齐前缀', () => {
    expect(normalizeArticleTo('my-title')).toBe('/articles/my-title');
  });

  it('已带前缀时不重复叠加（contracts 的 slugSchema 放行这种写法）', () => {
    expect(normalizeArticleTo('/articles/my-title')).toBe('/articles/my-title');
    expect(normalizeArticleTo('articles/my-title')).toBe('/articles/my-title');
  });

  it('首尾多余斜杠被剥掉', () => {
    expect(normalizeArticleTo('///my-title///')).toBe('/articles/my-title');
    expect(normalizeArticleTo('///articles///my-title///')).toBe(
      '/articles/my-title',
    );
  });

  it('中间的斜杠压成连字符，杜绝多级路径穿透', () => {
    expect(normalizeArticleTo('a/b/c')).toBe('/articles/a-b-c');
    expect(normalizeArticleTo('/articles/a//b')).toBe('/articles/a-b');
  });

  it('名字里以 articles 开头但不是前缀的 slug 不被误剥', () => {
    expect(normalizeArticleTo('articles-of-war')).toBe(
      '/articles/articles-of-war',
    );
  });
});
