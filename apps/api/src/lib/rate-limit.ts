/**
 * 轻量内存滑动窗口限流（单实例部署即可，无外部依赖）。
 *
 * 语义：每个 key 记录窗口内的请求时间戳；窗口过期自动回收（弱提及，
 * 仅保留最近 windowMs 内的时间戳），因此不需要额外的 TTL 清扫任务。
 * `now` 可注入以便测试。
 */
export interface RateLimiter {
  /** 尝试消费一次配额；允许则返回 true。 */
  check: (key: string) => boolean;
}

export interface RateLimiterOptions {
  /** 窗口长度（毫秒）。 */
  windowMs: number;
  /** 窗口内允许的最大请求数。 */
  max: number;
  /** 时间源，默认 Date.now()；测试注入固定时钟。 */
  now?: () => number;
}

export const createRateLimiter = (
  options: RateLimiterOptions,
): RateLimiter => {
  const timestampsByKey = new Map<string, number[]>();
  const windowMs = options.windowMs;
  const max = options.max;
  const now = options.now ?? Date.now;

  return {
    check(key: string): boolean {
      const current = now();
      const cutoff = current - windowMs;
      const timestamps = (timestampsByKey.get(key) ?? []).filter(
        (timestamp) => timestamp > cutoff,
      );

      if (timestamps.length >= max) {
        timestampsByKey.set(key, timestamps);
        return false;
      }

      timestamps.push(current);
      timestampsByKey.set(key, timestamps);
      return true;
    },
  };
};
