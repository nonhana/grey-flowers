import type { ContentCollectionItem } from '@nuxt/content'
import prisma from '~/lib/prisma'

const cachedParseMarkdown = defineCachedFunction(
  async (_articleKey: string, content: string) => {
    return await parseMarkdown(content, {
      highlight: {
        theme: {
          default: 'github-light',
          dark: 'github-dark',
        },
      },
      toc: {
        depth: 2,
        searchDepth: 2,
      },
    })
  },
  {
    maxAge: 60 * 60 * 24 * 7, // 固定缓存 7 天
    name: 'parsedArticles',
    getKey: (articleKey: string) => articleKey,
  },
)

export default formattedEventHandler(async (event) => {
  const query = getQuery(event)
  const path = query.path as string

  if (!path) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Path parameter is required',
    })
  }

  // 从数据库查询文章
  const article = await prisma.article.findUnique({
    where: { to: path },
    include: {
      tags: { select: { name: true } },
      category: { select: { name: true } },
    },
  })

  if (!article) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Article not found',
    })
  }

  // 使用缓存的 Markdown 解析器（首次解析后缓存，后续请求直接返回）
  const articleKey = `${article.to.replace(/\//g, ':')}:${article.editedAt.getTime()}`
  const parsed = await cachedParseMarkdown(articleKey, article.content || '')

  const payload: ContentCollectionItem = {
    id: article.to,
    path: article.to,
    stem: article.to,
    title: article.title,
    description: article.description || '',
    cover: article.cover,
    alt: article.alt,
    ogImage: article.ogImage,
    tags: article.tags.map(tag => tag.name),
    category: article.category?.name || '未分类',
    publishedAt: article.publishedAt.toISOString(),
    editedAt: article.editedAt.toISOString(),
    published: article.published,
    wordCount: article.wordCount,
    body: {
      type: parsed.body.type,
      children: parsed.body.children,
      toc: parsed.toc,
    },
    extension: 'md',
    meta: {},
  }

  return {
    payload,
  }
})
