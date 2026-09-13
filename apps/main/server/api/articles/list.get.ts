import { articleListDataSchema, articleListQuerySchema } from '@grey-flowers/contracts'

export default formattedEventHandler(async (event) => {
  const query = getQuery(event)
  const parsed = parsePublicQuery(articleListQuerySchema, {
    page: query.page,
    pageSize: query.pageSize,
    tag: query.tag,
    category: query.category,
    month: query.publishedAtMonth,
  })

  const data = await apiGet('/public/articles/list', {
    page: parsed.page,
    pageSize: parsed.pageSize,
    tag: parsed.tag,
    category: parsed.category,
    month: parsed.month,
  }, articleListDataSchema)

  const payload = data.items.map(article => ({
    ...resolveArticleImagePolicy({
      to: article.to,
      title: article.title,
      cover: article.cover,
      publishedAt: article.publishedAt,
    }),
    id: article.id,
    to: article.to,
    title: article.title,
    description: article.description,
    cover: article.cover,
    tags: article.tags,
    publishedAt: formatDateYmd(article.publishedAt),
    editedAt: formatDateYmd(article.editedAt),
    wordCount: article.wordCount,
  }))

  return { payload }
})
