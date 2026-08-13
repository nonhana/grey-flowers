import type { ArticleFilterQuery } from '#shared/types/articles'
import { apiGet } from '#server/utils/api-gateway'

export default formattedEventHandler(async (event) => {
  const query = getQuery(event) as ArticleFilterQuery
  const { count } = await apiGet<{ count: number }>('/public/articles/count', {
    tag: query.tag,
    category: query.category,
    month: query.publishedAtMonth,
  })
  return { payload: count }
})
