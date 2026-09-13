import type { ActivityPublic } from '@grey-flowers/contracts'
import { activityListQuerySchema, activityPublicListDataSchema } from '@grey-flowers/contracts'

function localizeTimes(activity: ActivityPublic): ActivityPublic {
  return {
    ...activity,
    publishedAt: formatDateTimeYmdHms(activity.publishedAt),
    editedAt: formatDateTimeYmdHms(activity.editedAt),
  }
}

export default formattedEventHandler(async (event) => {
  const query = getQuery(event)
  const parsed = parsePublicQuery(activityListQuerySchema, {
    page: query.page,
    pageSize: query.pageSize,
  })

  const data = await apiGet('/public/activities/list', {
    page: parsed.page,
    pageSize: parsed.pageSize,
  }, activityPublicListDataSchema)

  return { payload: data.items.map(localizeTimes) }
})
