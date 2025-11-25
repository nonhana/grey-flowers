import type { Prisma } from '@prisma/client'
import type { ArticleListQuery } from '~/server/types/articles'
import dayjs from 'dayjs'
import prisma from '~/lib/prisma'

type Options = Prisma.ArticleWhereInput
  & {
    page: number
    pageSize: number
    publishedAtMonth?: string
  }

async function selectArticleList(options: Options) {
  const { page, pageSize, publishedAtMonth, ...rest } = options
  if (publishedAtMonth) {
    const curMonth = dayjs(publishedAtMonth).toDate()
    const nextMonth = dayjs(publishedAtMonth).add(1, 'month').toDate()
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
    publishedAt: dayjs(article.publishedAt).format('YYYY-MM-DD'),
    editedAt: dayjs(article.editedAt).format('YYYY-MM-DD'),
  }))
  return result
}

export default formattedEventHandler(async (event) => {
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
  return { payload: articles }
})
