import type { ActivityItem } from '~/types/activity'

export const activityData: ActivityItem[] = Array.from({ length: 10 }, (_, i) => ({
  id: i,
  title: `Activity ${i}`,
  content: `This is the content of activity ${i}.
  This is the content of activity ${i}.
  This is the content of activity ${i}.
  This is the content of activity ${i}.
  This is the content of activity ${i}.
This is the content of activity ${i}.`,
  publishedAt: '2021-10-10',
  commentCount: 10,
  editedAt: '2021-10-10',
}))
