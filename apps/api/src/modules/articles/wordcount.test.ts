import { describe, expect, it } from 'vitest';

import { countArticleWordCount } from './wordcount';

describe('countArticleWordCount', () => {
  it('CJK 逐字计 1', () => {
    expect(countArticleWordCount('灰色花园')).toBe(4);
  });

  it('连续 ASCII 字母数字串计 1', () => {
    expect(countArticleWordCount('hello world 2026')).toBe(3);
    expect(countArticleWordCount('a-b-c')).toBe(3);
  });

  it('中英混排按各自口径相加', () => {
    // 「用」「重」「写」3 字 + nuxt + 4 = 5
    expect(countArticleWordCount('用 nuxt 4 重写')).toBe(5);
  });

  it('围栏代码块整体不计入', () => {
    const markdown = '正文\n\n```ts\nconst a = 1\nconst b = 2\n```\n\n结尾';
    expect(countArticleWordCount(markdown)).toBe(4);
  });

  it('行内代码只计其中的可见文本', () => {
    expect(countArticleWordCount('用 `useFetch` 取数')).toBe(4);
  });

  it('链接只计文字，URL 不计', () => {
    expect(countArticleWordCount('[灰色花园](https://caelum.moe/a/b)')).toBe(4);
  });

  it('图片只计 alt 文本', () => {
    expect(
      countArticleWordCount('![封面](https://cdn.example.com/a.png)'),
    ).toBe(2);
  });

  it('标题井号与强调符号不计入', () => {
    expect(countArticleWordCount('# 标题\n\n**粗体** _斜体_ ~~删除~~')).toBe(8);
  });

  it('HTML 标签不计入', () => {
    expect(countArticleWordCount('<div class="x">正文</div>')).toBe(2);
  });

  it('空内容与纯标点为 0', () => {
    expect(countArticleWordCount('')).toBe(0);
    expect(countArticleWordCount('，。！——…… \n\n')).toBe(0);
  });
});
