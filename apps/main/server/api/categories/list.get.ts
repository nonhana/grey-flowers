import type { PublicCategory } from '@grey-flowers/contracts'
import { apiGet } from '#server/utils/api-gateway'

export default formattedEventHandler(async () => {
  const data = await apiGet<{ items: PublicCategory[] }>('/public/categories')
  return { payload: data.items }
})
