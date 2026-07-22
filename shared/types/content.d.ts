export interface ArticleHeader {
  title: string
  description: string
  image: string
  imageSource: ArticleImageSource
  alt: string
  tags: string[]
  category: string
  publishedAt: string
  editedAt: string
  published: boolean
  wordCount: number
}
