import type { ArticleSearchItem } from '@grey-flowers/contracts'
import type { ArticleSearchQuery } from '#shared/types/articles'
import { apiGet } from '#server/utils/api-gateway'
import { formatDateYmd } from '#shared/utils/date'

export default formattedEventHandler(async (event) => {
  const searchQuery = getQuery(event) as ArticleSearchQuery
  const data = await apiGet<{ items: ArticleSearchItem[] }>(
    '/public/articles/search',
    {
      q: searchQuery.q,
      limit: searchQuery.limit,
    },
  )

  const payload = data.items.map(item => ({
    ...item,
    publishedAt: formatDateYmd(item.publishedAt),
  }))

  return { payload }
})
