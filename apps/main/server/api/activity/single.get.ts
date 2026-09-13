import type { ActivityPublic } from '@grey-flowers/contracts'
import { activityPublicSchema } from '@grey-flowers/contracts'

export default formattedEventHandler(async (event) => {
  const query = getQuery(event)
  const id = parsePositiveIntId(query.id)

  let activity: ActivityPublic
  try {
    activity = await apiGet(`/public/activities/${id}`, undefined, activityPublicSchema)
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
