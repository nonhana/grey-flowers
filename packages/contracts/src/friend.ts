import { z } from 'zod';

import { apiSuccessSchema, positiveIntSchema } from './common';
import { linkColorSchema, linkCreateBaseSchema, linkUrlSchema } from './link';

// 公开读 DTO（主站 /links 卡片；color 列可空，UI 当前不渲染）
export const friendSchema = z
  .object({
    id: positiveIntSchema,
    site: z.string().min(1),
    owner: z.string().min(1),
    url: z.url(),
    description: z.string(),
    image: z.url(),
    color: linkColorSchema.nullable(),
  })
  .strict();

export type Friend = z.infer<typeof friendSchema>;

// 管理 DTO：公开 DTO + 排序与时间戳
export const friendAdminSchema = friendSchema
  .extend({
    sortOrder: positiveIntSchema,
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strict();

export type FriendAdmin = z.infer<typeof friendAdminSchema>;

// 创建：color 可选（不传即入库为 NULL，不发明默认值）；字段集来自 link 基，image 必须是 URL
export const friendCreateInputSchema = linkCreateBaseSchema
  .extend({ image: linkUrlSchema })
  .strict();

export type FriendCreateInput = z.infer<typeof friendCreateInputSchema>;

// 更新：全字段 partial（单独换头像即 { image }）
export const friendUpdateInputSchema = friendCreateInputSchema.partial();

export type FriendUpdateInput = z.infer<typeof friendUpdateInputSchema>;

// 排序：ids 必须与当前列表的 id 全集完全一致（含无重复），按数组顺序写 sortOrder
export const friendReorderInputSchema = z
  .object({
    ids: z.array(positiveIntSchema),
  })
  .strict();

export type FriendReorderInput = z.infer<typeof friendReorderInputSchema>;

export const friendListDataSchema = z
  .object({
    items: z.array(friendAdminSchema),
  })
  .strict();

export const friendListResponseSchema = apiSuccessSchema(friendListDataSchema);

export type FriendListData = z.infer<typeof friendListDataSchema>;
export type FriendListResponse = z.infer<typeof friendListResponseSchema>;

export const friendResponseSchema = apiSuccessSchema(friendAdminSchema);

export type FriendResponse = z.infer<typeof friendResponseSchema>;

const friendWriteResultDataSchema = z
  .object({ id: positiveIntSchema })
  .strict();

/** 删除/排序响应：返回受影响的 id（删除）或新顺序（排序）。 */
export const friendDeleteResponseSchema = apiSuccessSchema(
  friendWriteResultDataSchema,
);

export type FriendDeleteData = z.infer<typeof friendWriteResultDataSchema>;
export type FriendDeleteResponse = z.infer<typeof friendDeleteResponseSchema>;

export const friendReorderResponseSchema = apiSuccessSchema(
  z.object({ ids: z.array(positiveIntSchema) }).strict(),
);

export type FriendReorderResponse = z.infer<typeof friendReorderResponseSchema>;

export const friendPublicListDataSchema = z
  .object({
    items: z.array(friendSchema),
  })
  .strict();

export const friendPublicListResponseSchema = apiSuccessSchema(
  friendPublicListDataSchema,
);

export type FriendPublicListData = z.infer<typeof friendPublicListDataSchema>;
export type FriendPublicListResponse = z.infer<
  typeof friendPublicListResponseSchema
>;
