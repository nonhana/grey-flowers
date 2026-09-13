import { overviewTrendQuerySchema } from '@grey-flowers/contracts';
import { Hono } from 'hono';

import type { AppDependencies } from '@/bootstrap/dependencies';
import type { ApiEnvironment } from '@/http/context';

import { createSuccess } from '@/http/errors';
import { adminGuard } from '@/http/middleware/admin-guard';
import { parseQuery } from '@/lib/parser';

/** 概览（只读投影，管理端）：挂载于 /overview。
    路由保持薄：验证查询 → 调 service → createSuccess。 */
export const createOverviewRoutes = (dependencies: AppDependencies) => {
  const routes = new Hono<ApiEnvironment>();
  const { admin, principal } = adminGuard(dependencies.environment);

  routes.get('/', principal, admin, async (context) => {
    const data = await dependencies.overview.get();
    return createSuccess(context, data);
  });

  // 近 365 天窗口固定、无查询参数：日历是「一眼看完整年」，不给它加旋钮。
  routes.get('/calendar', principal, admin, async (context) => {
    const data = await dependencies.overview.getCalendar();
    return createSuccess(context, data);
  });

  routes.get('/trends', principal, admin, async (context) => {
    const query = parseQuery(context.req.query(), overviewTrendQuerySchema);
    const data = await dependencies.overview.getTrends(
      query.metric,
      query.days,
    );
    return createSuccess(context, data);
  });

  return routes;
};
