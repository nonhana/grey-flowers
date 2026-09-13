import type { CommentPublic, CommentPublicTree } from '@grey-flowers/contracts'

export type CommentItem = CommentPublic
export type ParentCommentItem = CommentPublicTree

export interface IReplyComment {
  targetCommentLevel: 'PARENT' | 'CHILD'
  parentId: number
  userId: number
  username: string
  commentId: number
  content: string
}

export interface IDeleteComment {
  level: 'PARENT' | 'CHILD'
  id: number
  parentId?: number
}
