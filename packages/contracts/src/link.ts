import { z } from 'zod';

// 主站 /links 卡片（友链/作品）共用约束
export const linkColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, { message: '颜色需为 #RRGGBB 格式' });

export const linkUrlSchema = z
  .url({ message: '需为合法 URL' })
  .max(500, { message: 'URL 不能超过 500 个字符' });

export const linkCreateBaseSchema = z.object({
  site: z
    .string()
    .trim()
    .min(1, { message: '站点名不能为空' })
    .max(100, { message: '站点名不能超过 100 个字符' }),
  owner: z
    .string()
    .trim()
    .min(1, { message: '站长名不能为空' })
    .max(100, { message: '站长名不能超过 100 个字符' }),
  url: linkUrlSchema,
  description: z
    .string()
    .trim()
    .min(1, { message: '描述不能为空' })
    .max(500, { message: '描述不能超过 500 个字符' }),
  color: linkColorSchema.optional(),
});

export type LinkCardInput = z.infer<typeof linkCreateBaseSchema> & {
  image: string;
};
