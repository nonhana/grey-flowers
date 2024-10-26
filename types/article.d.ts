export interface ArticleCardProps {
  to: string
  title: string
  description: string
  cover: string
  tags: string[]
  publishedAt: string
  editedAt: string
  wordCount: number
  type?: 'common' | 'detail'
}

export interface Tag {
  id: number
  name: string
  color: string
  count: number
}
