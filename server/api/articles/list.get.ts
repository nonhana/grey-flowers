import type { ArticleWhereInput } from '~/prisma/generated/models'
import type { ArticleListQuery } from '~/server/types/articles'
import prisma from '~/lib/prisma'
import { resolveArticleImagePolicy } from '~/utils/article-generated-image'
import { formatDateYmd, getPublishedAtMonthRange } from '~/utils/date'

type Options = ArticleWhereInput
  & {
    page: number
    pageSize: number
    publishedAtMonth?: string
  }

async function selectArticleList(options: Options) {
  const { page, pageSize, publishedAtMonth, ...rest } = options
  if (publishedAtMonth) {
    const { start, end } = getPublishedAtMonthRange(publishedAtMonth)
    rest.publishedAt = { gte: start, lt: end }
  }
  const retrievedRes = await prisma.article.findMany({
    where: { ...rest, published: true },
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: { publishedAt: 'desc' },
    select: {
      id: true,
      to: true,
      title: true,
      description: true,
      cover: true,
      publishedAt: true,
      editedAt: true,
      wordCount: true,
      tags: { select: { name: true } },
    },
  })
  const result = retrievedRes.map(article => ({
    ...article,
    ...resolveArticleImagePolicy({
      to: article.to,
      title: article.title,
      cover: article.cover,
      publishedAt: article.publishedAt.toISOString(),
    }),
    tags: article.tags.map(tag => tag.name),
    publishedAt: formatDateYmd(article.publishedAt),
    editedAt: formatDateYmd(article.editedAt),
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
