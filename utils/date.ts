import dayjs from 'dayjs'

// 获取至今的相对时间文案
export function formatRelativeTime(value: string) {
  const date = dayjs(value)
  const now = dayjs()
  const diffMinutes = Math.max(0, now.diff(date, 'minute'))

  if (diffMinutes < 1)
    return '刚刚'
  if (diffMinutes < 60)
    return `${diffMinutes} 分钟前`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24)
    return `${diffHours} 小时前`

  const diffDays = now.diff(date, 'day')
  if (diffDays === 1)
    return '昨天'
  if (diffDays < 7)
    return `${diffDays} 天前`

  return date.format('MM.DD')
}
