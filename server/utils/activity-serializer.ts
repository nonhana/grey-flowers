import type { Prisma } from '~~/prisma/generated/client'
import type { activityWithMusicArgs } from '#server/utils/prismaShortcut'
import type { ActivityItem } from '#shared/types/activity'
import type { MarkdownRenderPayload } from '#shared/types/markdown'
import prisma from '#server/utils/prisma'
import { formatDateTimeYmdHms } from '#shared/utils/date'

type ActivityWithMusic = Prisma.ActivityGetPayload<typeof activityWithMusicArgs>

export async function getActivityCommentCounts(activityIds: number[]) {
  const counts = new Map<number, number>()
  if (activityIds.length === 0)
    return counts

  const paths = activityIds.map(activityId => `/recently?id=${activityId}`)
  const rows = await prisma.comment.groupBy({
    by: ['path'],
    where: { path: { in: paths } },
    _count: { _all: true },
  })

  for (const row of rows) {
    const match = row.path.match(/id=(?<activityId>\d+)/)
    const { activityId } = match?.groups || {}
    if (activityId) {
      const id = Number.parseInt(activityId, 10)
      counts.set(id, row._count._all)
    }
  }

  return counts
}

export function serializeActivity(activity: ActivityWithMusic, commentCount: number): ActivityItem {
  return {
    ...activity,
    contentMarkdown: activity.contentMarkdown as (MarkdownRenderPayload | null),
    commentCount,
    publishedAt: formatDateTimeYmdHms(activity.publishedAt),
    editedAt: formatDateTimeYmdHms(activity.editedAt),
  }
}

export async function serializeActivitiesWithCounts(activities: ActivityWithMusic[]) {
  const counts = await getActivityCommentCounts(activities.map(a => a.id))
  return activities.map(a => serializeActivity(a, counts.get(a.id) ?? 0))
}
