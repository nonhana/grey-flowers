import type { z } from 'zod';

import {
  authLoginInputSchema,
  authRegisterInputSchema,
  authUpdateMeInputSchema,
} from '@grey-flowers/contracts';
import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import process from 'node:process';

import type { AppDependencies } from '../../bootstrap/dependencies.js';
import type { ApiEnvironment } from '../../http/context.js';

import { ApiError, createSuccess } from '../../http/errors.js';
import { requireAllowedOrigin } from '../../http/middleware/require-allowed-origin.js';
import { requirePrincipal } from '../../http/middleware/require-principal.js';
import { parseBody } from '../../lib/parse-body.js';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
} from './tokens.js';

function clearRefreshCookie(
  context: Parameters<typeof deleteCookie>[0],
  dependencies: AppDependencies,
) {
  deleteCookie(context, REFRESH_COOKIE_NAME, {
    ...refreshCookieOptions(dependencies.environment),
    maxAge: 0,
  });
}

export function createAuthRoutes(dependencies: AppDependencies) {
  const routes = new Hono<ApiEnvironment>();
  const requireOrigin = requireAllowedOrigin(dependencies.environment);
  const principal = requirePrincipal(dependencies.environment);

  routes.post('/register', requireOrigin, async (context) => {
    const input = await parseBody(context.req.raw, authRegisterInputSchema);
    const user = await dependencies.auth.register(input);
    return createSuccess(context, { user }, 201);
  });

  routes.post('/login', requireOrigin, async (context) => {
    const input = await parseBody(context.req.raw, authLoginInputSchema);
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
    const refreshed = await dependencies.auth.refresh(
      getCookie(context, REFRESH_COOKIE_NAME),
    );
    if (!refreshed) {
      clearRefreshCookie(context, dependencies);
      throw new ApiError('AUTH_REQUIRED');
    }

    return createSuccess(context, {
      accessToken: refreshed.accessToken,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      principal: refreshed.principal,
    });
  });

  routes.post('/logout', requireOrigin, async (context) => {
    try {
      await dependencies.auth.logout(getCookie(context, REFRESH_COOKIE_NAME));
    } catch {
      process.stderr.write(
        `Unable to revoke refresh session requestId=${context.get('requestId')}\n`,
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
}
