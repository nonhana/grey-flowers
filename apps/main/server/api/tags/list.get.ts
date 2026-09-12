import { publicTagListDataSchema } from '@grey-flowers/contracts'

export default formattedEventHandler(async () => {
  const data = await apiGet('/public/tags', undefined, publicTagListDataSchema)
  return { payload: data.items }
})
