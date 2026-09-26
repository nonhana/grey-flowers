import { friendPublicListDataSchema } from '@grey-flowers/contracts'

export default formattedEventHandler(async () => {
  const data = await apiGet('/public/friends', undefined, friendPublicListDataSchema)
  return { payload: data.items }
})
