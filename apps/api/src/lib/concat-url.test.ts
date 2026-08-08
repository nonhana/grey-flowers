import { describe, expect, it } from 'vitest';

import { concatUrl } from './concat-url.js';

describe('concatUrl', () => {
  it('拼接 origin 与单段路径', () => {
    expect(concatUrl('https://cdn.example.com', 'a.png')).toBe(
      'https://cdn.example.com/a.png',
    );
  });

  it('origin 末尾的斜杠不会产生双斜杠', () => {
    expect(concatUrl('https://cdn.example.com///', 'a.png')).toBe(
      'https://cdn.example.com/a.png',
    );
  });

  it('多段路径用单斜杠连接', () => {
    expect(
      concatUrl('https://cdn.example.com', 'images', '2026', 'a.png'),
    ).toBe('https://cdn.example.com/images/2026/a.png');
  });

  it('不传路径段时以单斜杠收尾', () => {
    expect(concatUrl('https://cdn.example.com/')).toBe(
      'https://cdn.example.com/',
    );
  });
});
