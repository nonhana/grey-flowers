import type { Prisma } from '~/prisma/generated/client'

export const commentSelectObj = {
  id: true,
  path: true,
  content: true,
  contentMarkdown: true,
  level: true,
  author: { select: { id: true, username: true, site: true, avatar: true } },
  parent: { select: { id: true, content: true, authorId: true } },
  replyToUser: { select: { id: true, username: true } },
  replyToComment: { select: { id: true, content: true } },
  publishedAt: true,
  editedAt: true,
} satisfies Prisma.CommentSelect

export const childCommentArgs = {
  select: commentSelectObj,
} satisfies Prisma.CommentDefaultArgs

export const parentCommentArgs = {
  select: { ...commentSelectObj, children: { select: commentSelectObj } },
} satisfies Prisma.CommentDefaultArgs
