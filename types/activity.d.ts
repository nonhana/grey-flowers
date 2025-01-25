export interface ActivityItem {
  id: number
  title: string
  content?: string
  images?: string[]
  commentCount: number
  publishedAt: string
  editedAt: string
}

export interface IPostActivity {
  title: string
  content: string
  images: string[]
}
