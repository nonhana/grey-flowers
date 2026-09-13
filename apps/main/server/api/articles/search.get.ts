import { articleSearchListDataSchema, articleSearchQuerySchema } from '@grey-flowers/contracts'

export default formattedEventHandler(async (event) => {
  const query = getQuery(event)
  const parsed = parsePublicQuery(articleSearchQuerySchema, {
    q: query.q,
    limit: query.limit,
  })
  const data = await apiGet(
    '/public/articles/search',
    {
      q: parsed.q,
      limit: parsed.limit,
    },
    articleSearchListDataSchema,
  )

  const payload = data.items.map(item => ({
    ...item,
    publishedAt: formatDateYmd(item.publishedAt),
  }))

  return { payload }
})
