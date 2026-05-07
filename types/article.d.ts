export type ArticleCardVariant = 'featured' | 'compact' | 'row'

export interface ArticleCardProps {
  to: string
  title: string
  description: string
  cover: string
  tags: string[]
  publishedAt: string
  editedAt: string
  wordCount: number
  variant?: ArticleCardVariant
}
