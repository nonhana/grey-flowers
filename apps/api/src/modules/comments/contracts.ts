import type {
  CommentAdmin,
  CommentAdminTree,
  CommentPublic,
  CommentPublicTree,
} from '@grey-flowers/contracts';
import type { Prisma } from '@grey-flowers/db';

/** 公开读：与主站公开 select 逐字段一致（作者无 email）。 */
const commentAuthorPublicSelect = {
  avatar: true,
  id: true,
  site: true,
  username: true,
} satisfies Prisma.UserSelect;

/** 管理读：运营需联系作者。 */
const commentAuthorAdminSelect = {
  avatar: true,
  email: true,
  id: true,
  role: true,
  site: true,
  username: true,
} satisfies Prisma.UserSelect;

const commentParentSelect = {
  authorId: true,
  content: true,
  id: true,
} satisfies Prisma.CommentSelect;

const commentReplyToUserSelect = {
  id: true,
  username: true,
} satisfies Prisma.UserSelect;

const commentReplyToCommentSelect = {
  content: true,
  id: true,
} satisfies Prisma.CommentSelect;

/** 公开读：含 contentMarkdown 原样透传（主站渲染需要）。 */
export const commentPublicSelect = {
  content: true,
  contentMarkdown: true,
  editedAt: true,
  id: true,
  level: true,
  parent: { select: commentParentSelect },
  path: true,
  publishedAt: true,
  replyToComment: { select: commentReplyToCommentSelect },
  replyToUser: { select: commentReplyToUserSelect },
  author: { select: commentAuthorPublicSelect },
} satisfies Prisma.CommentSelect;

/** 管理读：Admin 不渲染 AST → 无 contentMarkdown；作者带 email/site/role。 */
export const commentAdminSelect = {
  content: true,
  editedAt: true,
  id: true,
  level: true,
  parent: { select: commentParentSelect },
  path: true,
  publishedAt: true,
  replyToComment: { select: commentReplyToCommentSelect },
  replyToUser: { select: commentReplyToUserSelect },
  author: { select: commentAuthorAdminSelect },
} satisfies Prisma.CommentSelect;

interface CommentPublicRecord extends Prisma.CommentGetPayload<{
  select: typeof commentPublicSelect;
}> {}

interface CommentAdminRecord extends Prisma.CommentGetPayload<{
  select: typeof commentAdminSelect;
}> {}

export const toCommentPublic = (
  record: CommentPublicRecord,
): CommentPublic => ({
  author: record.author,
  content: record.content,
  contentMarkdown: record.contentMarkdown,
  editedAt: record.editedAt.toISOString(),
  id: record.id,
  level: record.level,
  parent: record.parent,
  path: record.path,
  publishedAt: record.publishedAt.toISOString(),
  replyToComment: record.replyToComment,
  replyToUser: record.replyToUser,
});

export const toCommentAdmin = (record: CommentAdminRecord): CommentAdmin => ({
  author: record.author,
  content: record.content,
  editedAt: record.editedAt.toISOString(),
  id: record.id,
  level: record.level,
  parent: record.parent,
  path: record.path,
  publishedAt: record.publishedAt.toISOString(),
  replyToComment: record.replyToComment,
  replyToUser: record.replyToUser,
});

/** 管理树：children 按 publishedAt asc（对齐主站），childrenCount 供删除确认披露。 */
export const toCommentAdminTree = (
  record: CommentAdminRecord & { children: CommentAdminRecord[] },
  childrenCount: number,
): CommentAdminTree => ({
  ...toCommentAdmin(record),
  children: record.children.map(toCommentAdmin),
  childrenCount,
});

/** 公开树：children 按 publishedAt asc（对齐主站）。 */
export const toCommentPublicTree = (
  record: CommentPublicRecord & { children: CommentPublicRecord[] },
): CommentPublicTree => ({
  ...toCommentPublic(record),
  children: record.children.map(toCommentPublic),
});
