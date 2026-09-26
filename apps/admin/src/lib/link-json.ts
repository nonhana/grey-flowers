import type { LinkCardInput } from '@grey-flowers/contracts';
import type { ZodType } from 'zod';

export interface LinkJsonForm {
  color: string;
  description: string;
  image: string;
  owner: string;
  site: string;
  url: string;
}

export type LinkJsonResult =
  | { form: LinkJsonForm; ok: true }
  | { error: string; ok: false };

const REQUIRED_KEYS = ['description', 'image', 'owner', 'site', 'url'] as const;

export const parseLinkJson = (
  text: string,
  inputSchema: ZodType<LinkCardInput>,
): LinkJsonResult => {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { error: '不是合法的 JSON。', ok: false };
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { error: 'JSON 需要是一个对象。', ok: false };
  }

  const source = raw as Record<string, unknown>;
  const missing = REQUIRED_KEYS.filter(
    (key) => !(key in source) && !(key === 'description' && 'desc' in source),
  );
  if (missing.length > 0) {
    return {
      error: `JSON 缺少字段：${missing.map((key) => `「${key}」`).join('、')}`,
      ok: false,
    };
  }

  const parsed = inputSchema.safeParse({
    color: source.color,
    description: source.description ?? source.desc,
    image: source.image,
    owner: source.owner,
    site: source.site,
    url: source.url,
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? 'JSON 字段不合法。',
      ok: false,
    };
  }

  const data = parsed.data;
  return {
    form: {
      color: data.color ?? '',
      description: data.description,
      image: data.image,
      owner: data.owner,
      site: data.site,
      url: data.url,
    },
    ok: true,
  };
};
