import type { PublicTag } from '@grey-flowers/contracts'
import { apiGet } from '#server/utils/api-gateway'

export default formattedEventHandler(async () => {
  const data = await apiGet<{ items: PublicTag[] }>('/public/tags')
  return { payload: data.items }
})
