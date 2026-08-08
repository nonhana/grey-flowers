/**
 * 轻量内存滑动窗口限流（单实例部署即可，无外部依赖）。
 *
 * 语义：每个 key 记录窗口内的请求时间戳；窗口过期自动回收（弱提及，
 * 仅保留最近 windowMs 内的时间戳），因此不需要额外的 TTL 清扫任务。
 * key 数量另有硬上界（`maxKeys`）：随机伪造 key 只会把表推到上界后
 * 触发回收，不会无限增长。`now` 可注入以便测试。
 */
export interface RateLimiter {
  /** 尝试消费一次配额；允许则返回 true。 */
  check: (key: string) => boolean;
  /** 当前追踪中的 key 数量（回收行为的可观测出口，仅用于测试/诊断）。 */
  size: () => number;
}

export interface RateLimiterOptions {
  /** 窗口长度（毫秒）。 */
  windowMs: number;
  /** 窗口内允许的最大请求数。 */
  max: number;
  /**
   * 同时追踪的 key 数量上界（默认 10000）。超出时先丢整窗过期的 key，
   * 仍超则按 LRU 淘汰最久未访问的 key。
   */
  maxKeys?: number;
  /** 时间源，默认 Date.now()；测试注入固定时钟。 */
  now?: () => number;
}

const DEFAULT_MAX_KEYS = 10_000;

export const createRateLimiter = (options: RateLimiterOptions): RateLimiter => {
  // 依赖 Map 的插入序即访问序：每次 check 都 delete + set，把 key 顶到表尾，
  // 于是从表头遍历就是「最久未访问优先」的 LRU 顺序。
  const timestampsByKey = new Map<string, number[]>();
  const windowMs = options.windowMs;
  const max = options.max;
  const maxKeys = Math.max(options.maxKeys ?? DEFAULT_MAX_KEYS, 1);
  const now = options.now ?? Date.now;

  /** 超上界时的回收：先丢整窗过期的 key，不够再按 LRU 丢最久未访问的。 */
  const evict = (cutoff: number) => {
    for (const [key, timestamps] of timestampsByKey) {
      if (timestampsByKey.size <= maxKeys) return;
      if ((timestamps.at(-1) ?? 0) <= cutoff) timestampsByKey.delete(key);
    }

    for (const key of timestampsByKey.keys()) {
      if (timestampsByKey.size <= maxKeys) return;
      timestampsByKey.delete(key);
    }
  };

  return {
    check(key: string): boolean {
      const current = now();
      const cutoff = current - windowMs;
      const timestamps = (timestampsByKey.get(key) ?? []).filter(
        (timestamp) => timestamp > cutoff,
      );

      const allowed = timestamps.length < max;
      if (allowed) timestamps.push(current);

      timestampsByKey.delete(key);
      timestampsByKey.set(key, timestamps);
      if (timestampsByKey.size > maxKeys) evict(cutoff);

      return allowed;
    },
    size: () => timestampsByKey.size,
  };
};
