import {
  workCreateInputSchema,
  workLogoConfirmInputSchema,
  workLogoUploadUrlInputSchema,
  workReorderInputSchema,
  workUpdateInputSchema,
} from '@grey-flowers/contracts';
import { Hono } from 'hono';

import type { AppDependencies } from '@/bootstrap/dependencies';
import type { ApiEnvironment } from '@/http/context';

import { createSuccess } from '@/http/errors';
import { adminGuard } from '@/http/middleware/admin-guard';
import { parseBody, parseId } from '@/lib/parser';

/** 管理接口：挂载于 /works */
export const createWorkRoutes = (dependencies: AppDependencies) => {
  const routes = new Hono<ApiEnvironment>();
  const { admin, principal } = adminGuard(dependencies.environment);

  routes.get('/', principal, admin, async (context) => {
    return createSuccess(context, await dependencies.works.list());
  });

  routes.post('/', principal, admin, async (context) => {
    const input = await parseBody(context.req.raw, workCreateInputSchema);
    const work = await dependencies.works.create(input);
    return createSuccess(context, work, 201);
  });

  /** Logo 直传第一步：签发原资产桶 presigned PUT URL（key = works-logo/{filename}）。 */
  routes.post('/logo/upload-url', principal, admin, async (context) => {
    const input = await parseBody(
      context.req.raw,
      workLogoUploadUrlInputSchema,
    );
    return createSuccess(
      context,
      await dependencies.works.createLogoUploadUrl(input),
    );
  });

  /** Logo 直传第三步：PUT 完成后回执，HEAD 校验并返回 deliveryUrl。 */
  routes.post('/logo/confirm', principal, admin, async (context) => {
    const input = await parseBody(context.req.raw, workLogoConfirmInputSchema);
    return createSuccess(
      context,
      await dependencies.works.confirmLogoUpload(input),
    );
  });

  // 静态段必须先于 PATCH /:id 注册，否则 /reorder 会被当作 id 吞掉
  routes.patch('/reorder', principal, admin, async (context) => {
    const input = await parseBody(context.req.raw, workReorderInputSchema);
    return createSuccess(context, await dependencies.works.reorder(input.ids));
  });

  routes.patch('/:id', principal, admin, async (context) => {
    const input = await parseBody(context.req.raw, workUpdateInputSchema);
    const work = await dependencies.works.update(
      parseId(context.req.param('id')),
      input,
    );
    return createSuccess(context, work);
  });

  routes.delete('/:id', principal, admin, async (context) => {
    const result = await dependencies.works.remove(
      parseId(context.req.param('id')),
    );
    return createSuccess(context, result);
  });

  /** 移除 Logo：真删 works-logo/ 前缀对象并置空 image（其余只清字段）。 */
  routes.delete('/:id/logo', principal, admin, async (context) => {
    return createSuccess(
      context,
      await dependencies.works.removeLogo(parseId(context.req.param('id'))),
    );
  });

  return routes;
};

/** 公开接口：挂载于 /public/works */
export const createWorkPublicRoutes = (dependencies: AppDependencies) => {
  const routes = new Hono<ApiEnvironment>();

  routes.get('/', async (context) => {
    return createSuccess(context, await dependencies.works.listPublic());
  });

  return routes;
};
