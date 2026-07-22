import type { ArticleImageSource } from '#shared/types/article'
import type { ArticleOgImageInput } from '#shared/utils/article-og-image'
import { buildOgImageUrl } from '#server/utils/nuxt-og-image-builder'
import { seoData } from '#shared/data/meta'
import {
  getArticleOgImageDefinition,
  getArticlePagePath,
  hasUsableArticleCover,
} from '#shared/utils/article-og-image'

export interface ResolvedArticleImagePolicy {
  generatedImage: string
  displayImage: string
  displayImageSource: ArticleImageSource
}

function joinBaseUrl(baseURL: string, path: string) {
  const normalizedBase = baseURL === '/'
    ? ''
    : `/${baseURL}`.replace(/\/+/g, '/').replace(/\/$/, '')

  return `${normalizedBase}${path}` || path
}

export function getCanonicalGeneratedArticleImagePath(article: ArticleOgImageInput) {
  const runtimeConfig = useRuntimeConfig()
  const ogImageDefault = runtimeConfig['nuxt-og-image'].defaults
  const extension = ogImageDefault.extension || 'png'
  const { url } = buildOgImageUrl(
    {
      ...getArticleOgImageDefinition(article),
      _path: getArticlePagePath(article),
    },
    extension,
    true,
    ogImageDefault,
  )

  return joinBaseUrl(runtimeConfig.app.baseURL, url)
}

export function resolveArticleImagePolicy(article: ArticleOgImageInput): ResolvedArticleImagePolicy {
  const generatedImage = getCanonicalGeneratedArticleImagePath(article)

  if (hasUsableArticleCover(article)) {
    return {
      generatedImage,
      displayImage: article.cover.trim(),
      displayImageSource: 'cover',
    }
  }

  return {
    generatedImage,
    displayImage: generatedImage,
    displayImageSource: 'generated',
  }
}

export function toAbsoluteArticleImageUrl(image: string, siteUrl = seoData.mySite) {
  return new URL(image, `${siteUrl}/`).toString()
}
