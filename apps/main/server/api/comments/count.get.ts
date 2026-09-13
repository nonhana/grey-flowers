import { commentCountSchema, commentPublicListQuerySchema } from '@grey-flowers/contracts'

export default formattedEventHandler(async (event) => {
  const query = getQuery(event)
  const { path } = parsePublicQuery(commentPublicListQuerySchema.pick({ path: true }), { path: query.path })

  const data = await apiGet('/public/comments/count', { path }, commentCountSchema)
  return { payload: data }
})
