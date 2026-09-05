import type { Context } from 'hono';

import {
  authLoginInputSchema,
  authRegisterInputSchema,
  authUpdateMeInputSchema,
} from '@grey-flowers/contracts';
import { getConnInfo } from '@hono/node-server/conninfo';
import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';

import type { AppDependencies } from '@/bootstrap/dependencies';
import type { ApiEnvironment } from '@/http/context';

import { ApiError, createSuccess } from '@/http/errors';
import { requireAllowedOrigin } from '@/http/middleware/require-allowed-origin';
import { requirePrincipal } from '@/http/middleware/require-principal';
import { resolveClientIp } from '@/lib/client-ip';
import { parseBody } from '@/lib/parser';
import { createRateLimiter, type RateLimiter } from '@/lib/rate-limit';

import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
} from './tokens';

// /auth/* 无登录限流 → 账号可被定向爆破（bcrypt 只拖慢不阻断）。
// 单实例部署下用内存窗口即可：IP 维度（注册/登录/刷新）防止单源爆破，
// 账号维度（登录）防止跨 IP 撞库与被盗 token 复用探测。
const ipWindowMs = 15 * 60 * 1000;
const ipMaxAttempts = 30;
const accountWindowMs = 15 * 60 * 1000;
const accountMaxAttempts = 10;
// key 上界：IP 维度是被伪造洪泛的主要面，给足真实用户量的同时封住内存增长；
// 账号维度只可能落在真实账号空间，上界更小。
const ipMaxKeys = 20_000;
const accountMaxKeys = 5_000;

const ipLimiter = createRateLimiter({
  windowMs: ipWindowMs,
  max: ipMaxAttempts,
  maxKeys: ipMaxKeys,
});
const accountLimiter = createRateLimiter({
  windowMs: accountWindowMs,
  max: accountMaxAttempts,
  maxKeys: accountMaxKeys,
});

/**
 * socket 对端地址。`getConnInfo` 直接读 node 的 `env.incoming.socket`，
 * 非 node-server 载体（如 `app.request()` 直调）下会抛 TypeError ——
 * 限流不该因为拿不到对端地址就把请求打成 500，取不到就当缺失。
 */
const remoteAddressOf = (context: Context<ApiEnvironment>) => {
  try {
    return getConnInfo(context).remote.address;
  } catch {
    return undefined;
  }
};

/** 客户端 IP：按可信反代跳数解析，杜绝 XFF 伪造绕过（见 lib/client-ip.ts）。 */
const clientIp = (
  context: Context<ApiEnvironment>,
  trustedProxyHops: number,
) => {
  return resolveClientIp({
    forwardedFor: context.req.header('X-Forwarded-For'),
    remoteAddress: remoteAddressOf(context),
    trustedProxyHops,
  });
};

const throwIfRateLimited = (key: string, limiter: RateLimiter) => {
  if (!limiter.check(key)) throw new ApiError('RATE_LIMITED');
};

const clearRefreshCookie = (
  context: Parameters<typeof deleteCookie>[0],
  dependencies: AppDependencies,
) => {
  deleteCookie(context, REFRESH_COOKIE_NAME, {
    ...refreshCookieOptions(dependencies.environment),
    maxAge: 0,
  });
};

export const createAuthRoutes = (dependencies: AppDependencies) => {
  const routes = new Hono<ApiEnvironment>();
  const requireOrigin = requireAllowedOrigin(dependencies.environment);
  const principal = requirePrincipal(dependencies.environment);
  const trustedProxyHops = dependencies.environment.TRUSTED_PROXY_HOPS;

  routes.post('/register', requireOrigin, async (context) => {
    throwIfRateLimited(`ip:${clientIp(context, trustedProxyHops)}`, ipLimiter);

    const input = await parseBody(context.req.raw, authRegisterInputSchema);
    const user = await dependencies.auth.register(input);
    return createSuccess(context, { user }, 201);
  });

  routes.post('/login', requireOrigin, async (context) => {
    const input = await parseBody(context.req.raw, authLoginInputSchema);
    throwIfRateLimited(`ip:${clientIp(context, trustedProxyHops)}`, ipLimiter);
    throwIfRateLimited(
      `account:${input.account.trim().toLowerCase()}`,
      accountLimiter,
    );

    const login = await dependencies.auth.login(
      input,
      getCookie(context, REFRESH_COOKIE_NAME),
    );
    setCookie(
      context,
      REFRESH_COOKIE_NAME,
      login.refreshCredential,
      refreshCookieOptions(dependencies.environment),
    );
    return createSuccess(context, {
      accessToken: login.accessToken,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      principal: login.principal,
    });
  });

  routes.post('/refresh', requireOrigin, async (context) => {
    throwIfRateLimited(`ip:${clientIp(context, trustedProxyHops)}`, ipLimiter);

    const refreshed = await dependencies.auth.refresh(
      getCookie(context, REFRESH_COOKIE_NAME),
    );
    if (!refreshed) {
      clearRefreshCookie(context, dependencies);
      throw new ApiError('AUTH_REQUIRED');
    }

    // 轮换：把新 refresh credential 写回 cookie，旧 secret 在服务端已作废。
    setCookie(
      context,
      REFRESH_COOKIE_NAME,
      refreshed.refreshCredential,
      refreshCookieOptions(dependencies.environment),
    );

    return createSuccess(context, {
      accessToken: refreshed.accessToken,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      principal: refreshed.principal,
    });
  });

  routes.post('/logout', requireOrigin, async (context) => {
    try {
      await dependencies.auth.logout(getCookie(context, REFRESH_COOKIE_NAME));
    } catch (error) {
      dependencies.logger.warn(
        { err: error, requestId: context.get('requestId') },
        'Unable to revoke refresh session',
      );
    }

    clearRefreshCookie(context, dependencies);
    return createSuccess(context, {});
  });

  routes.get('/session', principal, (context) => {
    return createSuccess(context, { principal: context.get('principal') });
  });

  routes.patch('/me', requireOrigin, principal, async (context) => {
    const input = await parseBody(context.req.raw, authUpdateMeInputSchema);
    const result = await dependencies.auth.updateMe(
      context.get('principal'),
      input,
    );
    return createSuccess(context, result);
  });

  return routes;
};
