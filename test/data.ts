import type { ArticleCardProps } from '~/types/article'

export const articleList: ArticleCardProps[] = Array.from({ length: 6 }).fill(0).map((_, index) => ({
  id: index,
  title: 'Hello, World!',
  description: 'This is the first article.This is the first article.This is the first article.This is the first article.This is the first article.This is the first article.This is the first article.This is the first article.This is the first article.This is the first article.This is the first article.This is the first article.',
  cover: 'http://dummyimage.com/400X400',
  tags: ['Hello', 'World'],
  publishedAt: '2022-01-01',
  editedAt: '2022-01-01',
  wordCount: 1000,
}))
