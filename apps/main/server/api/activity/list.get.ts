import type { ActivityPublic, ActivityPublicListData } from '@grey-flowers/contracts'
import { apiGet } from '#server/utils/api-gateway'
import { formatDateTimeYmdHms } from '#shared/utils/date'

function localizeTimes(activity: ActivityPublic): ActivityPublic {
  return {
    ...activity,
    publishedAt: formatDateTimeYmdHms(activity.publishedAt),
    editedAt: formatDateTimeYmdHms(activity.editedAt),
  }
}

export default formattedEventHandler(async (event) => {
  const query = getQuery(event) as { page?: string | number, pageSize?: string | number }
  const rawPage = Number.parseInt(String(query.page ?? '1'), 10)
  const rawPageSize = Number.parseInt(String(query.pageSize ?? '20'), 10)

  const page = Number.isNaN(rawPage) || rawPage < 1 ? 1 : rawPage
  const pageSize = Number.isNaN(rawPageSize) || rawPageSize < 1 ? 20 : rawPageSize

  const data = await apiGet<ActivityPublicListData>('/public/activities/list', {
    page,
    pageSize,
  })

  return { payload: data.items.map(localizeTimes) }
})
