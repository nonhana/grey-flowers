/**
 * 限流用的客户端 IP 归一化。
 *
 * `X-Forwarded-For` 整条都是客户端可写的：直接取首段等于让攻击者每次换个
 * 假 IP 就绕过 IP 维度限流。这里用「可信代理跳数」模型（等价于 Express 的
 * `trust proxy: n`）：只有最靠近本服务的 `trustedProxyHops` 段是自家反代
 * 追加的，可信的客户端地址落在 `entries[length - hops]`；nginx 的
 * `$proxy_add_x_forwarded_for` 会把真实对端追加到末尾，所以伪造段永远排在
 * 可信段左侧、取不到。`hops = 0`（无反代 / 本地直连）时完全忽略该头，
 * 只认 socket 对端地址。
 */
export interface ClientIpInput {
  /** 原始 X-Forwarded-For 头，缺失为 undefined。 */
  forwardedFor: string | undefined;
  /** socket 对端地址（唯一不可伪造的来源）。 */
  remoteAddress: string | undefined;
  /** 本服务前置的可信反代层数。 */
  trustedProxyHops: number;
}

/** 连对端地址都拿不到时的兜底 key（退化为全局共享窗口）。 */
export const UNKNOWN_CLIENT_IP = 'unknown';

export const resolveClientIp = (input: ClientIpInput): string => {
  const fallback = input.remoteAddress?.trim() || UNKNOWN_CLIENT_IP;
  if (input.trustedProxyHops <= 0) return fallback;

  const entries = (input.forwardedFor ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  if (entries.length === 0) return fallback;

  // 配置跳数多于实际链路时夹到最左段：宁可粒度变粗，也不越界读到
  // 客户端可伪造的区间之外的空值。
  const index = Math.max(entries.length - input.trustedProxyHops, 0);
  return entries[index] ?? fallback;
};
