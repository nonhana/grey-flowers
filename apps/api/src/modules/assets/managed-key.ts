/**
 * 受管资产 key：`assets/{YYYY}/{MM}/{uuid}.{ext}`（与用途解耦的唯一日期形态）。
 * 存量六前缀 key（article-covers/…）不 re-key；本形态仅约束新上传与 confirm 门禁。
 */

const MANAGED_ASSET_KEY_PATTERN = /^assets\/\d{4}\/\d{2}\/[^/]+\.[A-Za-z0-9]+$/;

/** 生成受管 key；日期段取 UTC（与既有月份前缀口径一致）。 */
export const buildManagedAssetKey = (
  now: Date,
  id: string,
  ext: string,
): string => {
  const year = String(now.getUTCFullYear()).padStart(4, '0');
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `assets/${year}/${month}/${id}.${ext}`;
};

/** 四段形态校验：首段 assets、次段 YYYY、三段 MM、末段含扩展名。天然拒绝越段与越界 key。 */
export const isManagedAssetKey = (key: string): boolean =>
  MANAGED_ASSET_KEY_PATTERN.test(key);
