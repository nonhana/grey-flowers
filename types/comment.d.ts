import type { SimpleUserInfo } from './user'

export interface CommentItem {
  id: number
  path: string
  content: string
  level: 'PARENT' | 'CHILD'
  author: SimpleUserInfo
  parent: {
    id: number
    content: string
    author: SimpleUserInfo
  } | null
  replyToUser: {
    id: number
    username: string
  } | null
  replyToComment: {
    id: number
    content: string
  } | null
  publishedAt: string
  editedAt: string
}

export interface ParentCommentItem extends CommentItem {
  children: CommentItem[]
}

export interface IPostComment {
  path: string
  content: string
  parentId?: number
  replyToUserId?: number
  replyToCommentId?: number
}

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
