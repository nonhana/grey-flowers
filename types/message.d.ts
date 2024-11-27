export interface MessageItem {
  content: string
  id: number
  publishedAt: string
  editedAt: string
  parent: {
    content: string
    id: number
  } | null
  author: {
    id: number
    username: string
    site: string | null
    avatar: string | null
  } | null
  isNew?: boolean
}
