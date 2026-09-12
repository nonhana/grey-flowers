import { articleNeighborsQuerySchema, neighborsSchema } from '@grey-flowers/contracts'

export default formattedEventHandler(async (event) => {
  const query = getQuery(event)
  const { path } = parsePublicQuery(articleNeighborsQuerySchema, { path: query.path })

  const neighbors = await apiGet('/public/articles/neighbors', { path }, neighborsSchema)

  const payload: Neighbors = neighbors.map(neighbor =>
    neighbor ? { title: neighbor.title, path: neighbor.to } : null,
  ) as Neighbors

  return { payload }
})
