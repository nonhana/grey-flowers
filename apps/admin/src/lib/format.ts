/** CN 时间本地化单例 Intl */
const dateTimeFormat = new Intl.DateTimeFormat('zh-CN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

/** Intl 格式化 CN 本地时间 */
export const formatDateTime = (value: string | number | Date) =>
  dateTimeFormat.format(new Date(value));

export const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;

  const units = ['KB', 'MB', 'GB'] as const;
  let value = bytes;
  let unit = 'B';

  for (const candidate of units) {
    if (value < 1024) break;
    value /= 1024;
    unit = candidate;
  }

  return `${value >= 100 ? Math.round(value) : value.toFixed(1)} ${unit}`;
};

/** ms -> mm:ss */
export const formatDurationMs = (ms: number) => {
  const seconds = Number.isFinite(ms) && ms > 0 ? Math.round(ms / 1000) : 0;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
};

/** s -> mm:ss */
export const formatDuration = (seconds: number) =>
  formatDurationMs(seconds * 1000);

export const formatCount = (value: number) => {
  if (value < 10000) return String(value);
  const wan = value / 10000;
  return `${wan >= 100 ? String(Math.round(wan)) : wan.toFixed(1)} 万`;
};

/** s -> hours */
export const formatHours = (seconds: number) => {
  if (seconds < 3600) return `${Math.round(seconds / 60)} 分钟`;
  const hours = seconds / 3600;
  return `${hours >= 100 ? String(Math.round(hours)) : hours.toFixed(1)} 小时`;
};
