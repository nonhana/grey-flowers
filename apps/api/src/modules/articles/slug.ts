import { pinyin } from 'pinyin-pro';

/**
 * 标题 → 可读 slug：中文段做拼音转写，连续非中文段保持原样，
 * 整体收敛为小写字母/数字/连字符。纯标点标题回退时间戳，保证非空。
 */
export function slugifyTitle(title: string): string {
  const syllables = pinyin(title, {
    nonZh: 'consecutive',
    toneType: 'none',
    type: 'array',
  });

  const slug = syllables
    .map((part) =>
      part
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-'),
    )
    .filter(Boolean)
    .join('-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');

  if (slug) return slug;

  const fallback = new Date().toISOString().slice(0, 10);
  return `article-${fallback}`;
}

/**
 * 将客户端 slug（`my-title` 或 `/articles/my-title`）归一为文章路径
 * `/articles/<slug>`。
 */
export function normalizeArticleTo(slug: string): string {
  const bare = slug.replace(/^\/+|\/+$/g, '');
  return `/articles/${bare.replace(/\/+/g, '-')}`;
}
