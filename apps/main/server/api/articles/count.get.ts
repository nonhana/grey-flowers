import { articleCountDataSchema, articleFilterQuerySchema } from '@grey-flowers/contracts'

export default formattedEventHandler(async (event) => {
  const query = getQuery(event)
  const parsed = parsePublicQuery(articleFilterQuerySchema, {
    tag: query.tag,
    category: query.category,
    month: query.publishedAtMonth,
  })
  const { count } = await apiGet('/public/articles/count', {
    tag: parsed.tag,
    category: parsed.category,
    month: parsed.month,
  }, articleCountDataSchema)
  return { payload: count }
})
