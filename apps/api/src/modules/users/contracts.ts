import type { UserAdminSummary } from '@grey-flowers/contracts';
import type { Prisma } from '@grey-flowers/db';

/** 管理投影：合计评论数，无 password。 */
export const userAdminSelect = {
  _count: { select: { comments: true } },
  avatar: true,
  createdAt: true,
  email: true,
  id: true,
  role: true,
  site: true,
  updatedAt: true,
  username: true,
} satisfies Prisma.UserSelect;

type UserAdminRecord = Prisma.UserGetPayload<{
  select: typeof userAdminSelect;
}>;

export const toUserAdmin = (record: UserAdminRecord): UserAdminSummary => ({
  avatar: record.avatar,
  commentCount: record._count.comments,
  createdAt: record.createdAt.toISOString(),
  email: record.email,
  id: record.id,
  role: record.role,
  site: record.site,
  updatedAt: record.updatedAt.toISOString(),
  username: record.username,
});
