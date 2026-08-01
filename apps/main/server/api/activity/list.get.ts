import prisma from '#server/utils/prisma'

interface Options {
  page: number
  pageSize: number
}

async function selectActivityList(options: Options) {
  const { page, pageSize } = options

  const retrievedRes = await prisma.activity.findMany({
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: { publishedAt: 'desc' },
    ...activityWithMusicArgs,
  })

  return await serializeActivitiesWithCounts(retrievedRes)
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
