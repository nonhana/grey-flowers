import { z } from 'zod';

import { ASSET_IMAGE_MAX_BYTES } from './assets';
import { apiSuccessSchema, positiveIntSchema } from './common';
import { linkColorSchema, linkCreateBaseSchema, linkUrlSchema } from './link';

// Logo 可空：'' 表示未设置（可经 Logo 直传通道补充），否则必须是 URL
const imageSchema = z.union([z.literal(''), linkUrlSchema]);

// 公开读 DTO（主站 /links 卡片；color 列可空，UI 当前不渲染）
export const workSchema = z
  .object({
    id: positiveIntSchema,
    site: z.string().min(1),
    owner: z.string().min(1),
    url: z.url(),
    description: z.string(),
    image: imageSchema,
    color: linkColorSchema.nullable(),
  })
  .strict();

export type Work = z.infer<typeof workSchema>;

// 管理 DTO：公开 DTO + 排序与时间戳
export const workAdminSchema = workSchema
  .extend({
    sortOrder: positiveIntSchema,
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strict();

export type WorkAdmin = z.infer<typeof workAdminSchema>;

// 创建：color 可选（不传即入库为 NULL，不发明默认值）；image 可为 ''（暂无 Logo）；字段集来自 link 基
export const workCreateInputSchema = linkCreateBaseSchema
  .extend({ image: imageSchema })
  .strict();

export type WorkCreateInput = z.infer<typeof workCreateInputSchema>;

// 更新：全字段 partial（单独换图即 { image }）
export const workUpdateInputSchema = workCreateInputSchema.partial();

export type WorkUpdateInput = z.infer<typeof workUpdateInputSchema>;

// 排序：ids 必须与当前列表的 id 全集完全一致（含无重复），按数组顺序写 sortOrder
export const workReorderInputSchema = z
  .object({
    ids: z.array(positiveIntSchema),
  })
  .strict();

export type WorkReorderInput = z.infer<typeof workReorderInputSchema>;

export const workListDataSchema = z
  .object({
    items: z.array(workAdminSchema),
  })
  .strict();

export const workListResponseSchema = apiSuccessSchema(workListDataSchema);

export type WorkListData = z.infer<typeof workListDataSchema>;
export type WorkListResponse = z.infer<typeof workListResponseSchema>;

export const workResponseSchema = apiSuccessSchema(workAdminSchema);

export type WorkResponse = z.infer<typeof workResponseSchema>;

const workWriteResultDataSchema = z.object({ id: positiveIntSchema }).strict();

/** 删除/排序响应：返回受影响的 id（删除）或新顺序（排序）。 */
export const workDeleteResponseSchema = apiSuccessSchema(
  workWriteResultDataSchema,
);

export type WorkDeleteData = z.infer<typeof workWriteResultDataSchema>;
export type WorkDeleteResponse = z.infer<typeof workDeleteResponseSchema>;

export const workReorderResponseSchema = apiSuccessSchema(
  z.object({ ids: z.array(positiveIntSchema) }).strict(),
);

export type WorkReorderResponse = z.infer<typeof workReorderResponseSchema>;

export const workPublicListDataSchema = z
  .object({
    items: z.array(workSchema),
  })
  .strict();

export const workPublicListResponseSchema = apiSuccessSchema(
  workPublicListDataSchema,
);

export type WorkPublicListData = z.infer<typeof workPublicListDataSchema>;
export type WorkPublicListResponse = z.infer<
  typeof workPublicListResponseSchema
>;

/** Logo 允许的内容类型：assets 图片档 + svg/avif（原资产桶为站长自营公开域）。 */
export const WORK_LOGO_CONTENT_TYPES = [
  'image/avif',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/svg+xml',
  'image/webp',
] as const;

/** Logo 直传上限：与受管资产图片档一致。 */
export const WORK_LOGO_MAX_BYTES = ASSET_IMAGE_MAX_BYTES;

/** 直传第一步：按文件名签发原资产桶的 presigned PUT URL（key = works-logo/{filename}）。 */
export const workLogoUploadUrlInputSchema = z
  .object({
    filename: z.string().trim().min(1).max(120),
    /** 声明大小（字节）；presign 阶段预检，超限直接拒绝。 */
    size: positiveIntSchema.optional(),
  })
  .strict();

export type WorkLogoUploadUrlInput = z.infer<
  typeof workLogoUploadUrlInputSchema
>;

export const workLogoUploadUrlDataSchema = z
  .object({
    uploadUrl: z.url(),
    /** 原资产桶内 key；confirm 阶段原样回传。 */
    key: z.string().min(1),
    /** 按扩展名推导，浏览器 PUT 时必须携带同名 Content-Type。 */
    contentType: z.string().min(1),
    maxBytes: positiveIntSchema,
  })
  .strict();

export const workLogoUploadUrlResponseSchema = apiSuccessSchema(
  workLogoUploadUrlDataSchema,
);

export type WorkLogoUploadUrlData = z.infer<typeof workLogoUploadUrlDataSchema>;
export type WorkLogoUploadUrlResponse = z.infer<
  typeof workLogoUploadUrlResponseSchema
>;

/** 直传第三步：PUT 完成后回执，服务端 HEAD 校验对象存在后换取 deliveryUrl。 */
export const workLogoConfirmInputSchema = z
  .object({
    key: z.string().min(1).max(200),
  })
  .strict();

export type WorkLogoConfirmInput = z.infer<typeof workLogoConfirmInputSchema>;

export const workLogoConfirmDataSchema = z
  .object({
    deliveryUrl: z.url(),
  })
  .strict();

export const workLogoConfirmResponseSchema = apiSuccessSchema(
  workLogoConfirmDataSchema,
);

export type WorkLogoConfirmData = z.infer<typeof workLogoConfirmDataSchema>;
export type WorkLogoConfirmResponse = z.infer<
  typeof workLogoConfirmResponseSchema
>;

/** 移除 Logo：真删 R2 对象（works-logo/ 前缀内时）并把 image 置空。 */
export const workLogoRemoveResponseSchema = apiSuccessSchema(
  workWriteResultDataSchema,
);

export type WorkLogoRemoveData = z.infer<typeof workWriteResultDataSchema>;
export type WorkLogoRemoveResponse = z.infer<
  typeof workLogoRemoveResponseSchema
>;
