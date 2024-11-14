export interface MessageItem {
  id: number
  content: string
  author: {
    id: number
    name: string
    site: string
    avatar: string
  }
  publishedAt: string // YYYY-MM-DD HH:mm
  editedAt: string // YYYY-MM-DD HH:mm
  isMe: boolean
  replyTo?: {
    id: number
    content: string
  }
}
