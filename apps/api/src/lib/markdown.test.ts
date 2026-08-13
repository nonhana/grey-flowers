import { describe, expect, it } from 'vitest';

import { stripMarkdownToPlainText } from './markdown.js';

describe('stripMarkdownToPlainText', () => {
  it('围栏代码块整块替换为空白', () => {
    expect(stripMarkdownToPlainText('a\n```js\nconst x = 1\n```\nb')).toBe(
      'a\n \nb',
    );
  });

  it('行内代码保留内容、去掉反引号', () => {
    expect(stripMarkdownToPlainText('用 `useFetch` 取数')).toBe(
      '用 useFetch 取数',
    );
  });

  it('链接保留文字、丢掉 URL', () => {
    expect(stripMarkdownToPlainText('见 [文档](https://caelum.moe/docs)')).toBe(
      '见 文档',
    );
  });

  it('图片保留 alt、丢掉 src', () => {
    expect(
      stripMarkdownToPlainText('![封面](https://cdn.example.com/a.png)'),
    ).toBe('封面');
  });

  it('空 href / 空 src 也能剥干净', () => {
    expect(stripMarkdownToPlainText('[文字]()')).toBe('文字');
    expect(stripMarkdownToPlainText('![]()')).toBe('');
  });

  it('HTML 标签替换为空白，标签内文本保留', () => {
    expect(stripMarkdownToPlainText('<b>粗</b>体')).toBe(' 粗 体');
  });

  it('普通文本原样返回', () => {
    expect(stripMarkdownToPlainText('纯文本 plain text')).toBe(
      '纯文本 plain text',
    );
  });
});
