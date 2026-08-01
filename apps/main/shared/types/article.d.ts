export type ArticleCardVariant = 'featured' | 'compact' | 'row'
export type ArticleImageSource = 'cover' | 'generated'

export interface ArticleCardProps {
  to: string
  title: string
  description: string
  image: string
  imageSource: ArticleImageSource
  tags: string[]
  publishedAt: string
  editedAt: string
  wordCount: number
  variant?: ArticleCardVariant
}

export interface ArticleSearchItem {
  to: string
  title: string
  description: string
  category: string
  tags: string[]
  publishedAt: string
  snippet: string
  score: number
}
