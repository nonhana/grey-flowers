export interface ArticleOgImageInput {
  to?: string
  title?: string | null
  cover?: string | null
  publishedAt?: string | Date | null
}

export interface ArticleOgProps {
  title: string
  publishedAt: string
}

export interface ArticleOgImageDefinition {
  component: typeof ARTICLE_OG_IMAGE_COMPONENT
  props: ArticleOgProps
}

export const ARTICLE_OG_IMAGE_COMPONENT = 'FlowerCover'

const DEFAULT_ARTICLE_TITLE = '暂无标题'

export function normalizeArticleText(value: string | null | undefined) {
  return value?.trim() ?? ''
}

export function normalizeOptionalArticleText(value: string | null | undefined) {
  const normalized = normalizeArticleText(value)
  return normalized.length > 0 ? normalized : undefined
}

export function hasUsableArticleCover(article: Pick<ArticleOgImageInput, 'cover'>): article is { cover: string } {
  return normalizeArticleText(article.cover).length > 0
}

export function formatArticleOgPublishedAt(value: ArticleOgImageInput['publishedAt']) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }

  const normalized = normalizeArticleText(value)
  return normalized ? normalized.slice(0, 10) : ''
}

export function getArticlePagePath(article: Pick<ArticleOgImageInput, 'to'>) {
  const resolvedPath = normalizeOptionalArticleText(article.to)

  if (!resolvedPath) {
    throw new Error('[og-image] Article image policy requires a canonical article route.')
  }

  return resolvedPath
}

export function getArticleOgProps(article: ArticleOgImageInput): ArticleOgProps {
  return {
    title: normalizeOptionalArticleText(article.title) ?? DEFAULT_ARTICLE_TITLE,
    publishedAt: formatArticleOgPublishedAt(article.publishedAt),
  }
}

export function getArticleOgImageDefinition(article: ArticleOgImageInput): ArticleOgImageDefinition {
  return {
    component: ARTICLE_OG_IMAGE_COMPONENT,
    props: getArticleOgProps(article),
  }
}
