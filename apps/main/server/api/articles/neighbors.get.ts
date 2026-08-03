import type { Neighbors } from '@grey-flowers/contracts'
import type { Neighbors as MainNeighbors } from '#shared/types/markdown'
import { apiGet } from '#server/utils/api-gateway'

export default formattedEventHandler(async (event) => {
  const query = getQuery(event)
  const path = query.path as string

  if (!path) {
    return {
      statusCode: 400,
      statusMessage: 'Path parameter is required',
      success: false,
    }
  }

  const neighbors = await apiGet<Neighbors>('/public/articles/neighbors', {
    path,
  })

  const payload: MainNeighbors = neighbors.map(neighbor =>
    neighbor ? { title: neighbor.title, path: neighbor.to } : null,
  ) as MainNeighbors

  return { payload }
})
