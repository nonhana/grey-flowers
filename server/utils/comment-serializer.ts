import type { childCommentArgs, parentCommentArgs } from './prismaShortcut'
import type { Prisma } from '~/prisma/generated/client'
import type { CommentItem, ParentCommentItem } from '~/types/comment'
import type { MarkdownRenderPayload } from '~/types/markdown'
import dayjs from 'dayjs'

type RawChildComment = Prisma.CommentGetPayload<typeof childCommentArgs>
type RawParentComment = Prisma.CommentGetPayload<typeof parentCommentArgs>

export function serializeChildComment(comment: RawChildComment): CommentItem {
  return {
    id: comment.id,
    path: comment.path,
    content: comment.content,
    contentMarkdown: (comment.contentMarkdown as MarkdownRenderPayload | null) ?? null,
    level: comment.level,
    author: comment.author,
    parent: comment.parent,
    replyToUser: comment.replyToUser,
    replyToComment: comment.replyToComment,
    publishedAt: dayjs(comment.publishedAt).format('YYYY-MM-DD HH:mm:ss'),
    editedAt: dayjs(comment.editedAt).format('YYYY-MM-DD HH:mm:ss'),
  }
}

export function serializeParentComment(comment: RawParentComment): ParentCommentItem {
  return {
    ...serializeChildComment(comment),
    children: comment.children.map(serializeChildComment),
  }
}
