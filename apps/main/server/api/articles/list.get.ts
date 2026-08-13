import type { ArticleCard } from '@grey-flowers/contracts'
import type { ArticleListQuery } from '#shared/types/articles'
import { apiGet } from '#server/utils/api-gateway'
import { resolveArticleImagePolicy } from '#server/utils/article-generated-image'
import { formatDateYmd } from '#shared/utils/date'

export default formattedEventHandler(async (event) => {
  const query = getQuery(event) as ArticleListQuery
  const data = await apiGet<{ items: ArticleCard[] }>('/public/articles/list', {
    page: query.page,
    pageSize: query.pageSize,
    tag: query.tag,
    category: query.category,
    month: query.publishedAtMonth,
  })

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
