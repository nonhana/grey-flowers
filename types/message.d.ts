import type { SimpleUserInfo } from './user'

export interface MessageItem {
  content: string
  id: number
  publishedAt: string
  editedAt: string
  parent: {
    content: string
    id: number
  } | null
  author: SimpleUserInfo
  isNew?: boolean
}
