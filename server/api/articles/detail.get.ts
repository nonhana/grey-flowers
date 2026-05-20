import type { ArticleMarkdownPayload } from '~/types/markdown'
import prisma from '~/lib/prisma'
import { resolveArticleImagePolicy } from '~/utils/article-generated-image'

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

  // 从数据库查询文章
  const article = await prisma.article.findUnique({
    where: { to: path, published: true },
    select: {
      to: true,
      title: true,
      description: true,
      cover: true,
      alt: true,
      content: true,
      publishedAt: true,
      editedAt: true,
      published: true,
      wordCount: true,
      tags: { select: { name: true } },
      category: { select: { name: true } },
    },
  })

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
      publishedAt: article.publishedAt.toISOString(),
    }),
    id: article.to,
    path: article.to,
    stem: article.to,
    title: article.title,
    description: article.description || '',
    cover: article.cover,
    alt: article.alt,
    tags: article.tags.map(tag => tag.name),
    category: article.category?.name || '未分类',
    publishedAt: article.publishedAt.toISOString(),
    editedAt: article.editedAt.toISOString(),
    published: article.published,
    wordCount: article.wordCount,
    ...toMarkdownRenderPayload(parsed),
  }

  return { payload }
})
