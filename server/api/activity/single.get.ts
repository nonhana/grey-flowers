import prisma from '~/lib/prisma'
import { formatDateTimeYmdHms } from '~/utils/date'

async function selectSingleActivity(id: number) {
  const activity = await prisma.activity.findUnique({
    where: { id },
    select: {
      id: true,
      content: true,
      images: true,
      publishedAt: true,
      editedAt: true,
    },
  })

  return activity
}

export default formattedEventHandler(async (event) => {
  const query = getQuery(event) as { id: string }
  const id = Number.parseInt(query.id)
  const activity = await selectSingleActivity(id)
  if (!activity) {
    return {
      statusCode: 404,
      statusMessage: 'Activity not found',
      success: false,
    }
  }
  const result = {
    ...activity,
    commentCount: 0,
    publishedAt: formatDateTimeYmdHms(activity.publishedAt),
    editedAt: formatDateTimeYmdHms(activity.editedAt),
  }

  return { payload: result }
})
