import type { ArticleWhereInput } from '~~/prisma/generated/models'
import type { ArticleFilterQuery } from '#shared/types/articles'
import prisma from '#server/utils/prisma'
import { getPublishedAtMonthRange } from '#shared/utils/date'

type Options = ArticleWhereInput & { publishedAtMonth?: string }

async function selectArticleCount(options: Options) {
  const { publishedAtMonth, ...rest } = options
  if (publishedAtMonth) {
    const { start, end } = getPublishedAtMonthRange(publishedAtMonth)
    rest.publishedAt = { gte: start, lt: end }
  }
  return await prisma.article.count({ where: { ...rest, published: true } })
}

export default formattedEventHandler(async (event) => {
  const query = getQuery(event) as ArticleFilterQuery
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
