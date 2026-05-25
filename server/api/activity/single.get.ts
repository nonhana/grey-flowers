import prisma from '~/lib/prisma'

async function selectSingleActivity(id: number) {
  return await prisma.activity.findUnique({
    where: { id },
    ...activityWithMusicArgs,
  })
}

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

  const activity = await selectSingleActivity(id)
  if (!activity) {
    return {
      statusCode: 404,
      statusMessage: 'Activity not found',
      success: false,
    }
  }

  return { payload: serializeActivity(activity, 0) }
})
