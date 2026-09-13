import { articleDatesSchema } from '@grey-flowers/contracts'

// 发布文章的 { 年: [月份] } 映射（月份为 "MM"）
export default formattedEventHandler(async () => {
  const payload = await apiGet('/public/articles/dates', undefined, articleDatesSchema)
  return { payload }
})
