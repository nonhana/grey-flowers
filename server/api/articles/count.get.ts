import type * as p from '@prisma/client'
import type { ArticleCountQuery } from '~/server/types/articles'
import dayjs from 'dayjs'
import prisma from '~/lib/prisma'

type Options = p.Prisma.ArticleWhereInput & { publishedAtMonth?: string }

async function selectArticleCount(options: Options) {
  const { publishedAtMonth, ...rest } = options
  if (publishedAtMonth) {
    const curMonth = dayjs(publishedAtMonth).toDate()
    const nextMonth = dayjs(publishedAtMonth).add(1, 'month').toDate()
    rest.publishedAt = { gte: curMonth, lt: nextMonth }
  }
  return await prisma.article.count({ where: rest })
}

export default formattedEventHandler(async (event) => {
  const query = getQuery(event) as ArticleCountQuery
  const tagName = query.tag as string | undefined
  const categoryName = query.category as string | undefined
  const publishedAtMonth = query.publishedAtMonth as string | undefined

  const options: Options = {}
  if (tagName) {
    options.tags = { some: { name: tagName } }
  }
  if (categoryName) {
    options.category = { name: categoryName }
  }
  if (publishedAtMonth) {
    options.publishedAtMonth = publishedAtMonth
  }

  const count = await selectArticleCount(options)
  return { payload: count }
})
