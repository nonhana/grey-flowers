import { publicCategoryListDataSchema } from '@grey-flowers/contracts'

export default formattedEventHandler(async () => {
  const data = await apiGet('/public/categories', undefined, publicCategoryListDataSchema)
  return { payload: data.items }
})
