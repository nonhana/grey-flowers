import { pinyin } from 'pinyin-pro';

/**
 * 标题 → 可读 slug：中文段做拼音转写，连续非中文段保持原样，
 * 整体收敛为小写字母/数字/连字符。纯标点标题回退时间戳，保证非空。
 */
export const slugifyTitle = (title: string): string => {
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
};

/**
 * 将客户端 slug（`my-title` 或 `/articles/my-title`，两种形式 contracts 的
 * `slugSchema` 都放行）归一为文章路径 `/articles/<slug>`。
 * 已带 `articles/` 前缀的不再叠加，其余层级斜杠压成连字符。
 */
export const normalizeArticleTo = (slug: string): string => {
  const bare = slug.replace(/^\/+|\/+$/g, '').replace(/^articles\/+/, '');
  return `/articles/${bare.replace(/\/+/g, '-')}`;
};
