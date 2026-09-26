import { WORK_LOGO_CONTENT_TYPES } from '@grey-flowers/contracts';

export const LOGO_KEY_PREFIX = 'works-logo/';

/** 文件名（= key 末段）：中英文/数字开头，允许点、下划线、连字符；必须带图片扩展名；禁止路径分隔符。 */
const LOGO_FILENAME_PATTERN =
  /^[\p{L}\p{N}][\p{L}\p{N}._-]{0,110}\.[A-Za-z0-9]{1,8}$/u;

const CONTENT_TYPE_OF_EXTENSION: Record<string, string> = {
  avif: 'image/avif',
  gif: 'image/gif',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  svg: 'image/svg+xml',
  webp: 'image/webp',
};

export const isAllowedLogoContentType = (contentType: string): boolean =>
  (WORK_LOGO_CONTENT_TYPES as readonly string[]).includes(contentType);

/** key → Content-Type（按扩展名推导；非图片扩展名返回 undefined）。 */
export const logoContentTypeOfKey = (key: string): string | undefined => {
  if (!key.startsWith(LOGO_KEY_PREFIX)) return undefined;
  const extension = key.split('.').pop()?.toLowerCase() ?? '';
  const contentType = CONTENT_TYPE_OF_EXTENSION[extension];
  return contentType !== undefined && isAllowedLogoContentType(contentType)
    ? contentType
    : undefined;
};

/** 校验文件名并拼出原桶 key（works-logo/{filename}）；不合法返回 null。 */
export const buildLogoKey = (filename: string): string | null => {
  const trimmed = filename.trim();
  if (!LOGO_FILENAME_PATTERN.test(trimmed)) return null;
  if (logoContentTypeOfKey(`${LOGO_KEY_PREFIX}${trimmed}`) === undefined)
    return null;
  return `${LOGO_KEY_PREFIX}${trimmed}`;
};

/** key → 公开 delivery URL（路径段逐段编码，兼容 CJK 文件名）。 */
export const logoDeliveryUrl = (publicUrl: string, key: string): string =>
  `${publicUrl.replace(/\/+$/, '')}/${key
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')}`;

/** 由 deliveryUrl 推导桶内 key；非本公开域或解析失败返回 null（外链不删，只清字段）。 */
export const logoKeyFromUrl = (
  publicUrl: string,
  url: string,
): string | null => {
  try {
    const parsed = new URL(url);
    if (parsed.origin !== new URL(publicUrl).origin) return null;
    return decodeURIComponent(parsed.pathname.slice(1));
  } catch {
    return null;
  }
};
