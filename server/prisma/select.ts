import type * as p from '@prisma/client'

export const selectCommentObj: p.Prisma.CommentSelect = {
  id: true,
  path: true,
  content: true,
  level: true,
  parentId: true,
  author: {
    select: {
      id: true,
      username: true,
      site: true,
      avatar: true,
    },
  },
  replyToUser: { select: { id: true, username: true } },
  replyToComment: { select: { id: true, content: true } },
  publishedAt: true,
  editedAt: true,
}
