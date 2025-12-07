import type { Prisma } from '@prisma/client'

export const commentSelectObj: Prisma.CommentSelect = {
  id: true,
  path: true,
  content: true,
  level: true,
  author: { select: { id: true, username: true, site: true, avatar: true } },
  parent: { select: { id: true, content: true, author: { select: { id: true, username: true, site: true, avatar: true } } } },
  replyToUser: { select: { id: true, username: true } },
  replyToComment: { select: { id: true, content: true } },
  publishedAt: true,
  editedAt: true,
}
