import type { ActivityPublic } from '@grey-flowers/contracts'
import { apiGet, isApiNotFound } from '#server/utils/api-gateway'
import { formatDateTimeYmdHms } from '#shared/utils/date'

export default formattedEventHandler(async (event) => {
  const query = getQuery(event) as { id: string }
  const id = Number.parseInt(query.id, 10)
  if (Number.isNaN(id) || id < 1) {
    return {
      statusCode: 400,
      statusMessage: 'Invalid activity id',
      success: false,
    }
  }

  let activity: ActivityPublic
  try {
    activity = await apiGet<ActivityPublic>(`/public/activities/${id}`)
  }
  catch (error) {
    if (isApiNotFound(error)) {
      return {
        statusCode: 404,
        statusMessage: 'Activity not found',
        success: false,
      }
    }
    throw error
  }

  return {
    payload: {
      ...activity,
      publishedAt: formatDateTimeYmdHms(activity.publishedAt),
      editedAt: formatDateTimeYmdHms(activity.editedAt),
    },
  }
})
