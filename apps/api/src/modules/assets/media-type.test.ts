import { describe, expect, it } from 'vitest';

import { mediaTypeOfMime } from './media-type';

describe('mediaTypeOfMime', () => {
  it('命中图片白名单', () => {
    expect(mediaTypeOfMime('image/jpeg')).toBe('IMAGE');
    expect(mediaTypeOfMime('image/webp')).toBe('IMAGE');
  });

  it('命中音频白名单', () => {
    expect(mediaTypeOfMime('audio/mpeg')).toBe('AUDIO');
    expect(mediaTypeOfMime('audio/ogg')).toBe('AUDIO');
  });

  it('未知 MIME 返回 undefined（含需 normalize 的别名）', () => {
    expect(mediaTypeOfMime('application/ogg')).toBeUndefined();
    expect(mediaTypeOfMime('audio/x-wav')).toBeUndefined();
    expect(mediaTypeOfMime('text/html')).toBeUndefined();
    expect(mediaTypeOfMime('')).toBeUndefined();
  });
});
