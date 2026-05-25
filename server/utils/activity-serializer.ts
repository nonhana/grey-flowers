import type { Prisma } from '~/prisma/generated/client'
import type { activityWithMusicArgs } from '~/server/utils/prismaShortcut'
import type { ActivityItem } from '~/types/activity'
import prisma from '~/lib/prisma'
import { formatDateTimeYmdHms } from '~/utils/date'

type ActivityWithMusic = Prisma.ActivityGetPayload<typeof activityWithMusicArgs>

export async function getActivityCommentCounts(activityIds: number[]) {
  const counts = new Map<number, number>()
  if (activityIds.length === 0)
    return counts

  const paths = activityIds.map(id => `/recently?id=${id}`)
  const rows = await prisma.comment.groupBy({
    by: ['path'],
    where: { path: { in: paths } },
    _count: { _all: true },
  })

  const pathToId = new Map(paths.map((path, i) => [path, activityIds[i]]))
  for (const row of rows) {
    const id = pathToId.get(row.path)
    if (id !== undefined)
      counts.set(id, row._count._all)
  }
  return counts
}

export function serializeActivity(activity: ActivityWithMusic, commentCount: number): ActivityItem {
  return {
    ...activity,
    commentCount,
    publishedAt: formatDateTimeYmdHms(activity.publishedAt),
    editedAt: formatDateTimeYmdHms(activity.editedAt),
  }
}

export async function serializeActivitiesWithCounts(activities: ActivityWithMusic[]) {
  const counts = await getActivityCommentCounts(activities.map(a => a.id))
  return activities.map(a => serializeActivity(a, counts.get(a.id) ?? 0))
}
