import { describe, expect, it } from 'vitest';

import {
  buildLogoKey,
  logoContentTypeOfKey,
  logoDeliveryUrl,
  logoKeyFromUrl,
} from './logo';

const PUBLIC_URL = 'https://grey-flowers-r2.caelum.moe';

describe('buildLogoKey', () => {
  it('接受常规文件名并拼出 works-logo/ 前缀 key', () => {
    expect(buildLogoKey('gallery-logo.webp')).toBe(
      'works-logo/gallery-logo.webp',
    );
    expect(buildLogoKey('  灰花.png  ')).toBe('works-logo/灰花.png');
    expect(buildLogoKey('my_logo.v2.svg')).toBe('works-logo/my_logo.v2.svg');
    expect(buildLogoKey('Campanula Logo.jpg'.replace(/ /gu, '-'))).toBe(
      'works-logo/Campanula-Logo.jpg',
    );
  });

  it('拒绝路径分隔符与隐藏文件', () => {
    expect(buildLogoKey('a/b.webp')).toBeNull();
    expect(buildLogoKey('..\\/..\/x.png')).toBeNull();
    expect(buildLogoKey('.hidden.png')).toBeNull();
  });

  it('拒绝缺扩展名与不认识的扩展名', () => {
    expect(buildLogoKey('no-ext')).toBeNull();
    expect(buildLogoKey('file.txt')).toBeNull();
    expect(buildLogoKey('file.')).toBeNull();
  });
});

describe('logoContentTypeOfKey', () => {
  it('按扩展名返回白名单 Content-Type', () => {
    expect(logoContentTypeOfKey('works-logo/a.webp')).toBe('image/webp');
    expect(logoContentTypeOfKey('works-logo/灰花.svg')).toBe('image/svg+xml');
    expect(logoContentTypeOfKey('works-logo/a.avif')).toBe('image/avif');
  });

  it('拒绝 works-logo/ 前缀之外与非图片扩展名', () => {
    expect(logoContentTypeOfKey('assets/2026/09/a.png')).toBeUndefined();
    expect(logoContentTypeOfKey('works-logo/a.txt')).toBeUndefined();
  });
});

describe('logoDeliveryUrl', () => {
  it('逐段编码路径', () => {
    expect(logoDeliveryUrl(PUBLIC_URL, 'works-logo/灰花.png')).toBe(
      'https://grey-flowers-r2.caelum.moe/works-logo/%E7%81%B0%E8%8A%B1.png',
    );
    expect(
      logoDeliveryUrl(
        'https://grey-flowers-r2.caelum.moe/',
        'works-logo/a.webp',
      ),
    ).toBe('https://grey-flowers-r2.caelum.moe/works-logo/a.webp');
  });
});

describe('logoKeyFromUrl', () => {
  it('同域 URL 解码出 key', () => {
    expect(
      logoKeyFromUrl(
        PUBLIC_URL,
        'https://grey-flowers-r2.caelum.moe/works-logo/%E7%81%B0%E8%8A%B1.png',
      ),
    ).toBe('works-logo/灰花.png');
    expect(
      logoKeyFromUrl(
        PUBLIC_URL,
        'https://grey-flowers-r2.caelum.moe/gallery-logo.webp',
      ),
    ).toBe('gallery-logo.webp');
  });

  it('外链与坏 URL 返回 null（不删，只清字段）', () => {
    expect(
      logoKeyFromUrl(PUBLIC_URL, 'https://cdn.example.com/a.png'),
    ).toBeNull();
    expect(logoKeyFromUrl(PUBLIC_URL, 'not a url')).toBeNull();
  });
});
