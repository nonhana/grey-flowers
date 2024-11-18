import type * as p from '@prisma/client'
import prisma from '~/lib/prisma'
import type { ArticleListQuery } from '~/server/types/articles'

type Options = p.Prisma.ArticleWhereInput
  & {
    page: number
    pageSize: number
    publishedAtMonth?: string // 2024-06
  }

async function selectArticleList(options: Options) {
  const { page, pageSize, publishedAtMonth, ...rest } = options
  if (publishedAtMonth) {
    const curMonth = new Date(publishedAtMonth)
    const nextMonth = new Date(curMonth.getFullYear(), curMonth.getMonth() + 1)
    rest.publishedAt = { gte: curMonth, lt: nextMonth }
  }
  const retrievedRes = await prisma.article.findMany({
    where: rest,
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: { publishedAt: 'desc' },
    include: { tags: { select: { name: true } } },
  })
  const result = retrievedRes.map(article => ({
    ...article,
    tags: article.tags.map(tag => tag.name),
    publishedAt: article.publishedAt.toISOString(),
    editedAt: article.editedAt.toISOString(),
  }))
  return result
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event) as ArticleListQuery
  const page = Number.parseInt(query.page as string) || 1
  const pageSize = Number.parseInt(query.pageSize as string) || 6
  const tagName = query.tag as string | undefined
  const categoryName = query.category as string | undefined
  const publishedAtMonth = query.publishedAtMonth as string | undefined

  const options: Options = {
    page,
    pageSize,
  }
  if (tagName) {
    options.tags = { some: { name: tagName } }
  }
  if (categoryName) {
    options.category = { name: categoryName }
  }
  if (publishedAtMonth) {
    options.publishedAtMonth = publishedAtMonth
  }

  const articles = await selectArticleList(options)
  return articles
})
