import dayjs from 'dayjs'
import prisma from '~/lib/prisma'

async function getActivityCommentCount(activityId: number) {
  const path = `/recently?id=${activityId}`
  return await prisma.comment.count({
    where: { path },
  })
}

async function selectActivityList() {
  const retrievedRes = await prisma.activity.findMany({
    orderBy: { publishedAt: 'desc' },
  })
  const result = await Promise.all(
    retrievedRes.map(async activity => ({
      ...activity,
      commentCount: await getActivityCommentCount(activity.id),
      publishedAt: dayjs(activity.publishedAt).format('YYYY-MM-DD HH:mm:ss'),
      editedAt: dayjs(activity.editedAt).format('YYYY-MM-DD HH:mm:ss'),
    })),
  )
  return result
}

export default formattedEventHandler(async () => {
  const activities = await selectActivityList()
  return { payload: activities }
})
