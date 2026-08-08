/**
 * refresh 轮换的重用宽限窗口。
 *
 * 轮换语义要求「旧 credential 再次出现 = 可能被盗 → 全族吊销」，但有两条
 * 完全正常的路径也会带着旧 credential 回来：
 * 1. 多标签页同时启动，各发一次 /auth/refresh —— 后到的那个还没收到新 cookie；
 * 2. 刷新响应在网络上丢了，客户端拿原 credential 重试。
 * 直接判重用会把真实用户全设备强制登出。这里采用与 Auth0/Okta 的
 * reuse interval 相同的做法：距上次轮换 ≤ 窗口内的旧 credential 视为在途重试，
 * 照常轮换发新的；超出窗口才是真正的重放。
 */
export const REFRESH_REUSE_GRACE_MS = 10 * 1000;

export type RefreshDecision = 'reject' | 'reuse-detected' | 'rotate';

export interface RefreshDecisionInput {
  /** 上一次轮换的时刻（Session.lastUsedAt）。 */
  lastRotatedAt: Date;
  matchesCurrentSecret: boolean;
  matchesPreviousSecret: boolean;
  /** 当前时刻（毫秒），便于测试注入。 */
  now: number;
}

export const decideRefresh = (input: RefreshDecisionInput): RefreshDecision => {
  if (input.matchesPreviousSecret) {
    const sinceRotation = input.now - input.lastRotatedAt.getTime();
    return sinceRotation <= REFRESH_REUSE_GRACE_MS
      ? 'rotate'
      : 'reuse-detected';
  }

  return input.matchesCurrentSecret ? 'rotate' : 'reject';
};
