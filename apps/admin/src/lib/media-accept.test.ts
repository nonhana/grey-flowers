import { describe, expect, it } from 'vitest';

import {
  AUDIO_ACCEPT_MAP,
  fileMatchesAccept,
  IMAGE_ACCEPT_MAP,
} from './media-accept';

describe('fileMatchesAccept', () => {
  it('wildcard MIME 命中 type', () => {
    expect(
      fileMatchesAccept(
        IMAGE_ACCEPT_MAP,
        new File(['x'], 'a.png', { type: 'image/png' }),
      ),
    ).toBe(true);
    expect(
      fileMatchesAccept(
        AUDIO_ACCEPT_MAP,
        new File(['x'], 'a.mp3', { type: 'audio/mpeg' }),
      ),
    ).toBe(true);
  });

  it('跨类型拒收：图片 map 不收音频 type，反之亦然', () => {
    expect(
      fileMatchesAccept(
        AUDIO_ACCEPT_MAP,
        new File(['x'], 'a.png', { type: 'image/png' }),
      ),
    ).toBe(false);
    expect(
      fileMatchesAccept(
        IMAGE_ACCEPT_MAP,
        new File(['x'], 'a.mp3', { type: 'audio/mpeg' }),
      ),
    ).toBe(false);
  });

  it('type 缺失时按扩展名兜底（剪贴板文件常无可靠 MIME）', () => {
    expect(
      fileMatchesAccept(IMAGE_ACCEPT_MAP, new File(['x'], 'shot.PNG')),
    ).toBe(true);
    expect(
      fileMatchesAccept(AUDIO_ACCEPT_MAP, new File(['x'], 'track.flac')),
    ).toBe(true);
  });

  it('type 与扩展名都不认识则拒收', () => {
    expect(
      fileMatchesAccept(
        IMAGE_ACCEPT_MAP,
        new File(['x'], 'evil.exe', { type: 'application/octet-stream' }),
      ),
    ).toBe(false);
    expect(fileMatchesAccept(IMAGE_ACCEPT_MAP, new File(['x'], ''))).toBe(
      false,
    );
  });
});
