import dayjs from 'dayjs'
import prisma from '~/lib/prisma'

interface Options {
  page: number
  pageSize: number
}

async function getActivityCommentCount(activityId: number) {
  const path = `/recently?id=${activityId}`
  return await prisma.comment.count({
    where: { path },
  })
}

async function selectActivityList(options: Options) {
  const { page, pageSize } = options

  const retrievedRes = await prisma.activity.findMany({
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: { publishedAt: 'desc' },
    include: {
      music: {
        select: {
          id: true,
          title: true,
          artist: true,
          album: true,
          src: true,
          seconds: true,
          cover: true,
        },
      },
    },
  })

  const result = await Promise.all(
    retrievedRes.map(async activity => ({
      ...activity,
      music: activity.music,
      commentCount: await getActivityCommentCount(activity.id),
      publishedAt: dayjs(activity.publishedAt).format('YYYY-MM-DD HH:mm:ss'),
      editedAt: dayjs(activity.editedAt).format('YYYY-MM-DD HH:mm:ss'),
    })),
  )

  return result
}

export default formattedEventHandler(async (event) => {
  const query = getQuery(event) as { page?: string | number, pageSize?: string | number }
  const rawPage = Number.parseInt(String(query.page ?? '1'), 10)
  const rawPageSize = Number.parseInt(String(query.pageSize ?? '20'), 10)

  const page = Number.isNaN(rawPage) || rawPage < 1 ? 1 : rawPage
  const pageSize = Number.isNaN(rawPageSize) || rawPageSize < 1 ? 20 : rawPageSize

  const activities = await selectActivityList({ page, pageSize })
  return { payload: activities }
})
