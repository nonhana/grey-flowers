import { workPublicListDataSchema } from '@grey-flowers/contracts'

export default formattedEventHandler(async () => {
  const data = await apiGet('/public/works', undefined, workPublicListDataSchema)
  return { payload: data.items }
})
