import type { Prisma } from '~~/prisma/generated/client'
import type { CommentItem, ParentCommentItem } from '#shared/types/comment'
import type { MarkdownRenderPayload } from '#shared/types/markdown'
import type { childCommentArgs, parentCommentArgs } from './prismaShortcut'
import { formatDateTimeYmdHms } from '#shared/utils/date'

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
    publishedAt: formatDateTimeYmdHms(comment.publishedAt),
    editedAt: formatDateTimeYmdHms(comment.editedAt),
  }
}

export function serializeParentComment(comment: RawParentComment): ParentCommentItem {
  return {
    ...serializeChildComment(comment),
    children: comment.children.map(serializeChildComment),
  }
}
