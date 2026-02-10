import type { Neighbors } from '~/store/modules/article'
import prisma from '~/lib/prisma'

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

  // 获取当前文章
  const currentArticle = await prisma.article.findUnique({
    where: { to: path },
    select: {
      publishedAt: true,
      title: true,
    },
  })

  if (!currentArticle) {
    return { payload: [null, null] as Neighbors }
  }

  // 获取前一篇文章（发布时间早于当前文章）
  const prevArticle = await prisma.article.findFirst({
    where: {
      publishedAt: { lt: currentArticle.publishedAt },
      title: { notIn: ['About', 'Friends'] },
    },
    orderBy: { publishedAt: 'desc' },
    select: {
      to: true,
      title: true,
    },
  })

  // 获取后一篇文章（发布时间晚于当前文章）
  const nextArticle = await prisma.article.findFirst({
    where: {
      publishedAt: { gt: currentArticle.publishedAt },
      title: { notIn: ['About', 'Friends'] },
    },
    orderBy: { publishedAt: 'asc' },
    select: {
      to: true,
      title: true,
    },
  })

  const payload: Neighbors = [
    prevArticle ? { title: prevArticle.title, path: prevArticle.to } : null,
    nextArticle ? { title: nextArticle.title, path: nextArticle.to } : null,
  ]

  return { payload }
})
