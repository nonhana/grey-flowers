/** 中文本地化格式器：模块级单例（MED-1），formatDateTime 只做 .format()。 */
const dateTimeFormat = new Intl.DateTimeFormat('zh-CN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

/** 中文本地化的日期时间。接受 ISO 字符串、毫秒时间戳或 Date。 */
export const formatDateTime = (value: string | number | Date) => {
  return dateTimeFormat.format(new Date(value));
};

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

/** mm:ss。非有限值或 ≤0 一律显示 0:00（Typora 口径）。 */
export const formatDurationMs = (ms: number) => {
  const seconds = Number.isFinite(ms) && ms > 0 ? Math.round(ms / 1000) : 0;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
};

/** mm:ss，入参为秒（音频时长、播放进度）。 */
export const formatDuration = (seconds: number) =>
  formatDurationMs(seconds * 1000);

/** 大计数压到中文量级：9723 → 9723；972384 → 97.2 万。元数据行放得下才叫元数据。 */
export const formatCount = (value: number) => {
  if (value < 10000) return String(value);
  const wan = value / 10000;
  return `${wan >= 100 ? String(Math.round(wan)) : wan.toFixed(1)} 万`;
};

/** 累计时长按小时读。95100 秒写成 1585:00 不是时间，是一串数字。 */
export const formatHours = (seconds: number) => {
  if (seconds < 3600) return `${Math.round(seconds / 60)} 分钟`;
  const hours = seconds / 3600;
  return `${hours >= 100 ? String(Math.round(hours)) : hours.toFixed(1)} 小时`;
};
