import type { CommentCount } from '@grey-flowers/contracts'
import { apiGet } from '#server/utils/api-gateway'

export default formattedEventHandler(async (event) => {
  const query = getQuery(event)
  const path = query.path as string
  if (!path) {
    return { payload: { totalCount: 0, parentCount: 0 } }
  }

  const data = await apiGet<CommentCount>('/public/comments/count', { path })
  return { payload: data }
})
