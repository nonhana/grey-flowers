import type { Prisma } from '~~/prisma/generated/client'

const activityMusicSelect = {
  id: true,
  title: true,
  artist: true,
  album: true,
  src: true,
  seconds: true,
  cover: true,
} satisfies Prisma.MusicSelect

export const activityWithMusicArgs = {
  select: {
    id: true,
    content: true,
    contentMarkdown: true,
    images: true,
    publishedAt: true,
    editedAt: true,
    music: { select: activityMusicSelect },
  },
} satisfies Prisma.ActivityDefaultArgs

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
