type DateLike = Date | string | number

const DAY_MS = 24 * 60 * 60 * 1000
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const pad = (n: number) => String(n).padStart(2, '0')

function toDate(value: DateLike): Date {
  if (value instanceof Date)
    return value
  if (typeof value === 'string') {
    if (DATE_ONLY_PATTERN.test(value))
      // 2026-05-23 -> 2026-05-23T00:00:00，避免 UTC 解析
      return new Date(`${value}T00:00:00`)
    // 2026-05-23 12:23:34 -> 2026-05-23T12:23:34
    return new Date(value.replace(' ', 'T'))
  }
  return new Date(value)
}

function parts(d: Date) {
  return {
    Y: d.getFullYear(),
    M: pad(d.getMonth() + 1),
    D: pad(d.getDate()),
    h: pad(d.getHours()),
    m: pad(d.getMinutes()),
    s: pad(d.getSeconds()),
  }
}

/** Format: `YYYY-MM-DD` */
export function formatDateYmd(value: DateLike | null | undefined) {
  if (value == null)
    return ''
  const { Y, M, D } = parts(toDate(value))
  return `${Y}-${M}-${D}`
}

/** Format: `YYYY-MM-DD hh:mm:ss` */
export function formatDateTimeYmdHms(value: DateLike | null | undefined) {
  if (value == null)
    return ''
  const { Y, M, D, h, m, s } = parts(toDate(value))
  return `${Y}-${M}-${D} ${h}:${m}:${s}`
}

/** Format: `YYYY.MM.DD hh:mm` */
export function formatDateDotYmdHm(value: DateLike | null | undefined) {
  if (value == null)
    return ''
  const { Y, M, D, h, m } = parts(toDate(value))
  return `${Y}.${M}.${D} ${h}:${m}`
}

/** Format: `MM.DD` */
export function formatMonthDay(value: DateLike | null | undefined) {
  if (value == null)
    return ''
  const { M, D } = parts(toDate(value))
  return `${M}.${D}`
}

export function getDaysSince(value: DateLike, now: DateLike = new Date()) {
  return Math.floor((toDate(now).getTime() - toDate(value).getTime()) / DAY_MS)
}

// 'YYYY-MM' → [当月 1 号, 下月 1 号)
export function getPublishedAtMonthRange(value: string) {
  if (!/^\d{4}-\d{2}$/.test(value))
    throw new RangeError(`Invalid year-month: ${value}`)
  const y = Number(value.slice(0, 4))
  const m = Number(value.slice(5, 7))
  return { start: new Date(y, m - 1, 1), end: new Date(y, m, 1) }
}

export function formatRelativeTime(
  value: DateLike | null | undefined,
  now: DateLike = new Date(),
) {
  if (value == null)
    return ''
  const date = toDate(value)
  const diffMs = toDate(now).getTime() - date.getTime()
  const minutes = Math.max(0, Math.floor(diffMs / (60 * 1000)))

  if (minutes < 1)
    return '刚刚'
  if (minutes < 60)
    return `${minutes} 分钟前`

  const hours = Math.floor(minutes / 60)
  if (hours < 24)
    return `${hours} 小时前`

  const days = Math.floor(diffMs / DAY_MS)
  if (days === 1)
    return '昨天'
  if (days < 7)
    return `${days} 天前`

  return formatMonthDay(date)
}
