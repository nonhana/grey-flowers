import type { ArticleDetail } from '@grey-flowers/contracts'
import type { ArticleMarkdownPayload } from '#shared/types/markdown'
import { apiGet, isApiNotFound } from '#server/utils/api-gateway'
import { resolveArticleImagePolicy } from '#server/utils/article-generated-image'

export default formattedEventHandler(async (event) => {
  const query = getQuery(event)
  const path = query.path as string

  if (!path) {
    return {
      statusCode: 400,
      statusMessage: 'Path parameter is required',
      success: false,
    }
  }

  const previewToken = (query.preview as string | undefined) || undefined

  let article: ArticleDetail | null = null
  try {
    article = await apiGet<ArticleDetail>('/public/articles/detail', { path })
  }
  catch (error) {
    if (previewToken && isApiNotFound(error)) {
      // 草稿预览：一次 token 门控 SSR，未发布页面不被索引
      article = await apiGet<ArticleDetail>('/public/articles/preview', {
        path,
        token: previewToken,
      })
      setResponseHeader(event, 'X-Robots-Tag', 'noindex')
    }
    else if (!isApiNotFound(error)) {
      throw error
    }
  }

  if (!article) {
    return {
      statusCode: 404,
      statusMessage: 'Article not found',
      success: false,
    }
  }

  const articleContent = article.content || ''
  const parsed = await parseAppMarkdown(articleContent)

  const payload: ArticleMarkdownPayload = {
    ...resolveArticleImagePolicy({
      to: article.to,
      title: article.title,
      cover: article.cover,
      publishedAt: article.publishedAt,
    }),
    id: article.to,
    path: article.to,
    stem: article.to,
    title: article.title,
    description: article.description || '',
    cover: article.cover,
    alt: article.alt,
    tags: article.tags,
    category: article.category || '未分类',
    publishedAt: article.publishedAt,
    editedAt: article.editedAt,
    published: article.published,
    wordCount: article.wordCount,
    ...toMarkdownRenderPayload(parsed),
  }

  return { payload }
})
