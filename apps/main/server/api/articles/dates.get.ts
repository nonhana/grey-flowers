import type { ArticleDates } from '@grey-flowers/contracts'
import { apiGet } from '#server/utils/api-gateway'

// 发布文章的 { 年: [月份] } 映射（月份为 "MM"）
export default formattedEventHandler(async () => {
  const payload = await apiGet<ArticleDates>('/public/articles/dates')
  return { payload }
})
