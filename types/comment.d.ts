export interface CommentItem {
  id: number
  path: string
  content: string
  level: 'PARENT' | 'CHILD'
  parentId: number | null
  publishedAt: string
  editedAt: string
  author: {
    id: number
    username: string
    site: string | null
    avatar: string
  } | null
  replyToUser: {
    id: number
    username: string
  } | null
  replyToComment: {
    id: number
    content: string
  } | null
}

export interface ParentCommentItem extends CommentItem {
  children: CommentItem[]
}

export interface UserCommentItem extends CommentItem {
  parent: { content: string } | null
}

export interface UserParentCommentItem extends UserCommentItem {
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
