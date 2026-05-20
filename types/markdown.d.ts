import type { MDCParserResult, MDCRoot, Toc } from '@nuxtjs/mdc'
import type { ArticleImageSource } from '~/types/article'

export interface MarkdownRenderPayload {
  body: MDCRoot
  data: Record<string, any>
  toc?: Toc
  excerpt?: MDCParserResult['excerpt']
}

export interface ArticleMarkdownPayload extends MarkdownRenderPayload {
  id: string
  path: string
  stem: string
  title: string
  description: string
  cover: string | null
  alt: string
  tags: string[]
  category: string
  publishedAt: string
  editedAt: string
  published: boolean
  wordCount: number
  generatedImage: string
  displayImage: string
  displayImageSource: ArticleImageSource
}

export interface MarkdownPagePayload extends MarkdownRenderPayload {
  id: string
  path: string
  stem: string
}

export interface MarkdownNavigationItem {
  title: string
  path: string
}

export type NeighborItem = MarkdownNavigationItem | null
export type Neighbors = [NeighborItem, NeighborItem]

export type StaticMarkdownPageSlug = 'about' | 'friends'
