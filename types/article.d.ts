export interface ArticleCardProps {
  id: number
  title: string
  description: string
  cover: string
  tags: string[]
  publishedAt: string
  editedAt: string
  wordCount: number
}

export interface Tag {
  id: number
  name: string
  color: string
}
