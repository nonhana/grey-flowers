import { describe, expect, it } from 'vitest';

import { buildManagedAssetKey, isManagedAssetKey } from './managed-key';

describe('buildManagedAssetKey', () => {
  it('生成 assets/{YYYY}/{MM}/{id}.{ext} 日期形态', () => {
    expect(
      buildManagedAssetKey(new Date('2026-09-25T03:04:05Z'), 'uuid-1', 'jpg'),
    ).toBe('assets/2026/09/uuid-1.jpg');
  });

  it('月份补零，UTC 取值', () => {
    expect(
      buildManagedAssetKey(new Date('2027-01-05T00:30:00Z'), 'id', 'mp3'),
    ).toBe('assets/2027/01/id.mp3');
  });
});

describe('isManagedAssetKey', () => {
  it('接受标准四段日期 key', () => {
    expect(isManagedAssetKey('assets/2026/09/x.png')).toBe(true);
    expect(isManagedAssetKey('assets/1999/01/a.mp3')).toBe(true);
  });

  it('拒绝非 assets 首段', () => {
    expect(isManagedAssetKey('wiki/x.png')).toBe(false);
    expect(isManagedAssetKey('article-covers/202609/x.png')).toBe(false);
  });

  it('拒绝日期段越形', () => {
    expect(isManagedAssetKey('assets/foo/bar.png')).toBe(false);
    expect(isManagedAssetKey('assets/2026/091/x.png')).toBe(false);
    expect(isManagedAssetKey('assets/2026/x.png')).toBe(false);
  });

  it('拒绝越段与目录穿越', () => {
    expect(isManagedAssetKey('assets/2026/09/../x.png')).toBe(false);
    expect(isManagedAssetKey('assets/2026/09/01/x.png')).toBe(false);
  });

  it('拒绝缺扩展名', () => {
    expect(isManagedAssetKey('assets/2026/09/x')).toBe(false);
    expect(isManagedAssetKey('assets/2026/09/x.')).toBe(false);
  });
});
