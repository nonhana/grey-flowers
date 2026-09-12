import type { ArticleDetail } from '@grey-flowers/contracts'
import { articleDetailQuerySchema, articleDetailSchema, articlePreviewQuerySchema } from '@grey-flowers/contracts'

export default formattedEventHandler(async (event) => {
  const query = getQuery(event)
  const { path } = parsePublicQuery(articleDetailQuerySchema, { path: query.path })

  const previewToken = typeof query.preview === 'string' && query.preview
    ? parsePublicQuery(articlePreviewQuerySchema, { path, token: query.preview }).token
    : undefined

  let article: ArticleDetail | null = null
  try {
    article = await apiGet('/public/articles/detail', { path }, articleDetailSchema)
  }
  catch (error) {
    if (previewToken && isApiNotFound(error)) {
      // 草稿预览：一次 token 门控 SSR，未发布页面不被索引。
      // 防泄密 header（noindex / no-store / no-referrer）由 server/middleware
      // 按「文章路径 + ?preview=」落到最终页面响应，内部子路由不重复设置。
      article = await apiGet('/public/articles/preview', {
        path,
        token: previewToken,
      }, articleDetailSchema)
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
