# Main 契约 SSOT 收敛重构执行计划（apps/main 移除手写契约）

> 状态：待实施  
> 基线：`master` / `011895caa077df63894fe6aa04c13e1e8f389347`（2026-09-12）  
> 权限边界：本文件是本轮唯一写入；产品代码、配置、依赖和锁文件均未开始修改。实施须在单独的执行请求中开始，按切片顺序推进。

## Agreed outcome

### Goal

- apps/main 成为 `packages/contracts` 的纯消费方：所有与上游 Hono API 交换的数据结构（query、body、response payload）一律来自 contracts 的 schema 与类型；main 内不再存在手写复刻契约结构的 interface、手写运行时校验与手写信封判别。
- server 代理层（`server/api/*`、`server/utils/api-gateway.ts`）成为上游 API 唯一的校验边界：输入侧用契约 Input/Query schema 解析，响应侧用契约 Response schema 校验。
- 浏览器侧表单（评论发布、资料编辑、登录、注册）提交前用契约 Input schema `safeParse`，错误消息与服务端同源。
- 认证链路已是契约消费正例（`useApiClient` 全套 `apiEnvelopeSchema`），保持并作为新代码的样板。

### Constraints and invariants

- **contracts 本轮零修改**。经逐条核实，公开面 schema 已齐备（证据见 Current-state evidence）；此前调研报告中「缺公共 query/response schema」的 R2 判断为误报（`commentPublicListQuerySchema` 等均已存在）。
- **非 API 层校验不归 contract 层管**（本轮共识）：URL 参数宽容降级、路由 path param 门禁、本地持久化恢复、UI 状态钳制、静态页白名单，全部保持现状。
- legacy 信封协议 `{ statusCode, statusMessage, success, payload, error }` 形状逐字段保持；浏览器 ↔ main 的协议不重设计。
- 展示层时间语义不变：server 端本地化约定逐路由保持（活动/评论 `YYYY-MM-DD hh:mm:ss`、文章列表/搜索 `YYYY-MM-DD`、文章详情原始 ISO）；`shared/utils/date.ts` 的格式化函数不动。类型层面 `z.iso.datetime()` 推断即 `string`，本地化后的载荷与契约类型兼容，无需派生「localized 变体」。
- 认证链路不动：auth 请求浏览器直连上游（`apiOrigin`）+ 客户端 envelope 校验 + refresh 重放；`server/middleware/auth.ts` 与 `blackList` 门控不变。
- 所有 `/api/*` 路由的 URL、HTTP 方法、公开参数名不变（`publishedAtMonth` 等 URL 参数名保持，仅在解析时映射到契约字段 `month`）。
- zod 从 devDependencies 移入 dependencies（server 运行时语义）；版本仍走 workspace `catalog:`。
- 每个切片可独立停止：完整通过其 checkpoint 后，即使后续切片不实施，仓库仍可运行、构建、部署。切片按序独立提交，便于单切片 revert。
- 类型收紧暴露的编译错误逐个修复；若确属上游可空/可选字段，修 contracts schema 而不是在 main 消费方放宽——保持 SSOT 单向。

### Non-goals

- 不动 apps/admin（其 9 处表单 R1 与上传约束契约化另立批次）。
- 不动 apps/api 与 packages/db。
- 不重设计 legacy 信封协议，不把浏览器请求改为直连上游。
- 不统一时间本地化架构（列表 `Y-m-d` 与详情 ISO 的混合展示约定保持）。
- 不给 main 引入 vitest/测试基础设施（现有 gate 为 typecheck / lint / fmt / test(api+admin)）。
- 不处理调研报告 R3 清单（约 40 处 URL/UI/本地校验），不改任何视觉与交互。

## Current-state evidence

- `packages/contracts/src/articles.ts:263-316` — 公开响应 schema 已齐：`articleListDataSchema`/`articleListResponseSchema`/`articleDetailResponseSchema`/`articleCountResponseSchema`/`articleSearchResponseSchema`/`articleNeighborsResponseSchema`/`articleDatesResponseSchema`。
- `packages/contracts/src/comments.ts:215-262` — `commentCountSchema`、`commentPublicListQuerySchema`（path min1 max300 + coerce 分页）、`commentPublicListResponseSchema`、`commentPublicResponseSchema`、`commentMeResponseSchema` 等已存在。
- `packages/contracts/src/activities.ts:95-136` — `activityPublicSchema`/`activityPublicListDataSchema`/`activityPublicListResponseSchema`/`activityPublicResponseSchema`。
- `packages/contracts/src/taxonomy.ts:133-161` — `publicTagListDataSchema`/`publicCategoryListDataSchema` 及 Response。
- `apps/api/src/modules/articles/routes.ts:100,112,118`、`comments/routes.ts:71,77`、`activities/routes.ts:63` — 上游公开路由全部用同一批契约 schema `parseQuery` 校验输入；activities 公开列表与管理列表共用 `activityListQuerySchema`。响应侧收口与上游产出对称。
- `apps/api/src/modules/comments/routes.ts:19-22` — 先例：route 专属参数允许 route 内局部 schema（`commentCountQuerySchema`）；`apps/api/src/lib/parser.ts:34-38` — `parseId = z.coerce.number().int().positive()`，main 可镜像。
- `apps/main/server/utils/api-gateway.ts:5-19,53-69,103-119` — 手写 `ApiSuccessBody`/`ApiFailureBody`/`ApiBody` + `response.json() as ApiBody<T>` 纯断言零校验；`apiGet`/`apiMutate` 泛型 T 由调用方任意指定。
- 代理路由现状（全部经 `formattedEventHandler` 包裹，`server/utils/formattedEventHandler.ts:3-17` 手写信封接口）：`articles/list.get.ts:8` `as ArticleListQuery` 零校验直传（URL 参数 `publishedAtMonth` 映射上游 `month`）；`count.get.ts:5` 同类；`search.get.ts:7` q/limit 直传；`detail.get.ts:8-18` path truthiness + preview token `as string`；`neighbors.get.ts:7-15` path truthiness + `to→path` 重命名映射；`dates.get.ts` 无输入；`comments/post.post.ts:5` readBody 原样透传；`comments/delete.post.ts:5-13` 手写 `Number.isInteger && >= 1`（上游为 `DELETE /public/comments/:id` path param）；`comments/list.get.ts:20-31` path truthiness + parseInt 静默回退 1/10；`comments/count.get.ts:6-9` 缺 path 静默返回 0 计数；`activity/list.get.ts:14-19` parseInt 回退 1/20；`activity/single.get.ts:6-14` parseInt+400（已严格）；`user/comments.get.ts`、`messages.get.ts` 无输入；`categories/tags list.get.ts` 无输入；`markdown/[slug].get.ts:6-11` 白名单门控（R3 保留）；`routes/rss.xml.ts:17` 复用 `apiGet`。
- `apps/main/app/composables/useApiClient.ts:46-79` — 同一信封形状在浏览器侧第二次手写（`LegacyMainResponse` + `parseLegacyMainResponse`）；auth 六套 envelope 校验（L28-33）为正例；`legacyBearerRequest`（L257-267）带鉴权走 main 代理，`requestApi` 直连上游。
- 平行类型盘点：`shared/types/articles.d.ts:1-18`（三个 Query interface，URL string 版本）；`shared/types/comments.d.ts`（`CommentListQuery`）；`shared/types/comment.d.ts:32-38`（`IPostComment` 与契约 `CommentCreateInput` 逐字段相同）；`shared/types/activity.d.ts:3-22`（`Track` 与契约 `MusicTrack` 一字不差——`contracts/src/music.ts:13` 注释自证；`ActivityItem` 与 `ActivityPublic` 同形但字段全可选）；`shared/types/article.d.ts:17-26`（`ArticleSearchItem` 与契约同名类型同形）；`shared/types/user.d.ts`（`SimpleUserInfo` 与 `commentAuthorPublicSchema` 推断逐字段一致，见 `contracts/src/comments.ts:15-24`）。
- 保留类型（非契约复刻）：`article.d.ts` 的 `ArticleCardProps`/`ArticleCardVariant`/`ArticleImageSource`（展示 DTO）；`markdown.d.ts` 全部（`MarkdownRenderPayload`/`ArticleMarkdownPayload`/`Neighbors`——`to→path` 重命名是 main 自己的展示协议，`neighbors.get.ts:21-23` 映射保持显式）；`comment.d.ts` 的 `IReplyComment`/`IDeleteComment`（UI 内部状态）；`about/link/common/content.d.ts`（纯 UI）。
- 浏览器表单：`comment/Submit.vue:45-52`（仅 `if (!content)`，UI 宣称「最多 2048 字」未强制）；`user/InfoEditor.vue:35-68`（手写非空 + 密码成对检查；契约 refine 已内置同款规则与消息，`contracts/src/auth.ts:128-135`）；`main/Header/User.vue:64-74,106-134`（FormData typeof + 非空；注册无邮箱/site 格式校验）。
- 响应守卫散点：`useActivityList.ts:103-108`（`if (!data.success)` + `Array.isArray` + `as`）、`useArticleSearch.ts:35-43`（同型）、`comment/index.vue:37-54`（`payload?.totalCount || 0`、`payload as ParentCommentItem[]`）、`article/Main.vue:51,81`（`payload ?? 0`/`?? []`，useFetch 无类型标注）、`user/CommentsDialog.vue:18-20`、`MessagesDialog.vue:13-17`。
- `apps/main/shared/utils/date.ts:21-46` — 本地化用本地 getter（`getFullYear` 等），无显式时区转换，展示时间 = 服务器时钟墙钟时间；`getPublishedAtMonthRange`（L69-75）与契约 month 规则逐字重复且 grep 全 main 无调用方（疑似死代码）。
- `apps/main/package.json:54` — zod 在 devDependencies；`@grey-flowers/contracts` workspace 依赖已存在。
- main 无任何 `*.test.ts`/`*.spec.ts`；验证命令存在：`pnpm -F @grey-flowers/main run typecheck`、`pnpm -F @grey-flowers/main run lint`（eslint）、根 `pnpm fmt:check`、根 `pnpm test`（api+admin）。
- `#shared` 别名可同时被 app 与 server 引用（既有证据：server 路由 `import { formatDateTimeYmdHms } from '#shared/utils/date'`）。

## Incremental implementation

### Slice 1 — 依赖归位 + legacy 信封单点定义

- **Outcome:** legacy 信封形状在 main 只有一处定义（server 产出与浏览器消费共用）；zod 具备 server 运行时依赖语义；零行为变化。
- **Scope:** `apps/main/package.json`；(new) `apps/main/shared/legacy-envelope.ts`；`apps/main/server/utils/formattedEventHandler.ts`；`apps/main/app/composables/useApiClient.ts`。
- **Changes:**
  1. `package.json`：zod devDependencies → dependencies（版本 `catalog:` 不变），`pnpm install` 更新锁文件。
  2. `shared/legacy-envelope.ts` (new)：信封形状 zod schema——`z.object({ statusCode: z.number().int(), statusMessage: z.string(), success: z.boolean(), payload: z.unknown(), error: z.unknown() })`，**非 strict**（协议演进兼容；形状校验，非业务校验）；导出 `LegacyEnvelope<T>` 类型（payload: T | null）。
  3. `formattedEventHandler.ts`：本地 `ApiResponse`/`HandlerResponse` interface 改为消费共享类型（泛型透传），成功/错误归一逻辑逐行不变。
  4. `useApiClient.ts`：删除本地 `LegacyMainResponse` interface 与 `parseLegacyMainResponse` 手写形状检查，改用共享 schema `safeParse`（失败仍 `throw new Error('主站接口返回了无效响应。')`）；payload 边界收窄为一次集中泛型断言（唯一允许的边界 cast，注释说明）。
- **Preserved behavior:** 信封字段、HTTP 状态同步（formattedEventHandler.ts:72-73）、错误归一全部不变。
- **Dependencies:** 无。
- **Verification:** `pnpm -F @grey-flowers/main run typecheck`；`pnpm -F @grey-flowers/main run lint`；`pnpm dev:main` 任一页面正常渲染。
- **Done when:** grep 全 main 信封形状仅 `legacy-envelope.ts` 一处定义；typecheck/lint 绿。

### Slice 2 — api-gateway 响应侧契约收口

- **Outcome:** main server 对上游响应做一次契约校验（`apiEnvelopeSchema(dataSchema)`）；手写信封接口删除；类型化数据贯穿下游（运行时校验只发生在上游边界一次）。
- **Scope:** `server/utils/api-gateway.ts`；全部上游调用点：articles/{list,count,search,detail,neighbors,dates}、comments/{list,count,post,delete}、activity/{list,single}、user/{comments,messages}、categories/list、tags/list、routes/rss.xml.ts。
- **Changes:**
  1. `apiGet`/`apiMutate` 签名改为 `apiGet<T>(path, query, schema: ZodType<T>)`（传 **data schema**）：`apiEnvelopeSchema(schema).safeParse(body)` → success 分支返回 `parsed.data.data`；failure 分支按原样 `throw new ApiGatewayError(response.status, body.error.code, body.error.message)`；整体解析失败（非 JSON/形状不符）→ `ApiGatewayError(response.status, 'INTERNAL_ERROR', 'Malformed API response')`。
  2. 删除手写 `ApiSuccessBody`/`ApiFailureBody`/`ApiBody`。
  3. 调用点逐一传契约 data schema（与现有 `apiGet<T>` 泛型一一对应）：list→`articleListDataSchema`、count→`articleCountDataSchema`、search→`articleSearchListDataSchema`、detail/preview→`articleDetailSchema`、neighbors→`neighborsSchema`、dates→`articleDatesSchema`、comments list→`z.array(commentPublicTreeSchema)`、count→`commentCountSchema`、post→`commentPublicSchema`、delete→`commentDeleteResultSchema`、activity list→`activityPublicListDataSchema`、single→`activityPublicSchema`、user comments→`z.array(commentPublicTreeSchema)`、messages→`z.array(commentPublicSchema)`、categories→`publicCategoryListDataSchema`、tags→`publicTagListDataSchema`。
- **Preserved behavior:** `ApiGatewayError` 语义、路由返回形状、浏览器调用面全部不变。唯一守卫行为：上游输出偏离契约时从「静默垃圾」变为 500 envelope——这是本切片的目的，出现即暴露真实漂移。
- **Dependencies:** Slice 1（zod dependencies 归位）。
- **Verification:** typecheck；冒烟矩阵（`pnpm dev:api` + `pnpm dev:main`）：16 条上游调用各一发正常请求确认 200 且数据正常（curl 清单写入 PR 描述）；停掉 dev:api 打任一路由确认 500 envelope 干净。
- **Done when:** typecheck 绿 + 冒烟矩阵全过 + 手写 ApiBody 定义不复存在。

### Slice 3 — 路由输入侧契约解析

- **Outcome:** 全部代理路由的 query/body 用契约 schema 解析；非法输入 → 400 + 契约中文消息；路由内 `as` 断言与手写 truthiness 消失。
- **Scope:** Slice 2 清单中 12 条有输入路由；(new) `apps/main/server/utils/parser.ts`。
- **Changes:**
  1. `parser.ts` (new)：镜像 apps/api `lib/parser`——`parsePublicQuery(schema, query)`、`parsePublicBody(schema, event)`、`parsePositiveIntId(value)`；失败 `throw createError({ statusCode: 400, statusMessage: error.issues[0]?.message ?? '请求参数不合法' })`（formattedEventHandler 现有 getErrorStatus/getErrorStatusMessage 归一为 400 envelope）。
  2. 逐路由替换：
     - articles/list — 先重映射 `month: query.publishedAtMonth` → `articleListQuerySchema`；
     - articles/count — 同映射 → `articleFilterQuerySchema`；
     - articles/search — `articleSearchQuerySchema`；
     - articles/detail — path → `articleDetailQuerySchema`；preview 存在时 token → `articlePreviewQuerySchema`；
     - articles/neighbors — `articleNeighborsQuerySchema`；
     - comments/post — `commentCreateInputSchema`，`parsed.data` 转发上游；
     - comments/delete — 载荷是 main 自有约定（POST body `{commentId}` → 上游 DELETE path param）：route 局部 `z.object({ commentId: z.coerce.number().int().positive() }).strict()`（镜像 apps/api parseId 与 commentCountQuerySchema 先例）；
     - comments/list — `commentPublicListQuerySchema`；
     - comments/count — `commentPublicListQuerySchema.pick({ path: true })`；
     - activity/list — `activityListQuerySchema`（上游公开路由同款）；
     - activity/single — `parsePositiveIntId`（现状已是 400，语义不变）；
     - user/comments、messages、categories、tags、dates、markdown/[slug]、rss — 无输入或白名单门控，不动。
  3. 时间本地化/展示变换保持在解析之后（typed data 上操作）。
- **Preserved behavior:** URL 参数名、路由形状、400 信封结构不变；月份默认 `'01'` 逻辑留在 Main.vue（浏览器侧）。
- **行为对齐（有意变更，逐条记录）：**
  1. comments/list 垃圾分页（parseInt 失败静默回退 1/10）→ 400；
  2. activity/list 垃圾分页（回退 1/20）→ 400；
  3. comments/count 缺 path（静默 0 计数）→ 400（唯一调用方 `comment/index.vue:34-36` 始终传 path；上游同规则）。
  理由：上游本来就严格（articles 垃圾参数今天就是上游 400），统一后行为一致且利于 SEO；如线上出现噪音，单路由给对应字段加 `.catch` 默认值即可局部回退，无需重开设计。
- **Dependencies:** Slice 2（同文件，先收响应再收输入，避免二次触碰）。
- **Verification:** typecheck；curl 矩阵——每条路由 1 正常 + 1 非法（`?page=abc`、缺 path、超长 tag > 50）确认 400 中文消息；浏览器回归：文章列表/归档/标签/分类页、搜索、评论加载/翻页、活动 feed。
- **Done when:** 12 条路由内不再有 `as` 断言与 truthiness 400；矩阵全过。

### Slice 4 — shared/types 去重（类型收敛到契约）

- **Outcome:** main 不再手写复刻 API 数据结构；平行 interface 替换为契约类型导入/纯别名；纯 UI 类型与 main 自有 DTO 保留（白名单见 Current-state evidence）。
- **Scope:** `shared/types/{articles,comments,comment,activity,user,article}.d.ts` 及其全部导入点（约 43 个文件，多数只改 import 行）。
- **Changes:**
  1. articles.d.ts：删除三个 Query interface（Slice 3/5 后无导入点；消费方改从 contracts 导入同名类型）。
  2. comments.d.ts：`CommentListQuery` → 别名 `CommentPublicListQuery`（或直接改导入点后删文件）。
  3. comment.d.ts：`IPostComment` → 删除（用契约 `CommentCreateInput`）；`CommentItem` → `export type CommentItem = CommentPublic`；`ParentCommentItem` → `= CommentPublicTree`；`IReplyComment`/`IDeleteComment` 保留。
  4. activity.d.ts：`Track` → `= MusicTrack`；`ActivityItem` → `= ActivityPublic`（字段从可选收紧为必填；消费方既有 `?.`/`&&` 防御依然编译通过）。
  5. user.d.ts：`SimpleUserInfo` → `= CommentAuthorPublic`。
  6. article.d.ts：`ArticleSearchItem` → 契约同名（浏览器收到 `formatDateYmd` 后的 `YYYY-MM-DD`——类型层面仍是 string，安全）；`ArticleCardProps` 等展示类型保留。
  7. markdown.d.ts：全部保留。
- **Preserved behavior:** 零运行时变化，纯类型层。
- **Dependencies:** Slice 2、3（server 消费点已迁移完毕，剩余导入点全在浏览器侧）。
- **Verification:** `pnpm -F @grey-flowers/main run typecheck`（每个编译错误逐个修复，不放宽契约）+ lint。
- **Done when:** `shared/types/{articles,comments,activity,user}.d.ts` 无复刻契约结构的 interface 残留；typecheck 绿。

### Slice 5 — 浏览器侧收口（类型化信封 + 表单契约校验）

- **Outcome:** 浏览器散点 `$fetch` + `as` + 手写守卫收敛为类型化请求；四个表单提交前契约 `safeParse`，即时反馈且消息与 API 同源。
- **Scope:** `useApiClient.ts`；`comment/Submit.vue`；`user/InfoEditor.vue`；`main/Header/User.vue`；`comment/index.vue`；`useActivityList.ts`；`useArticleSearch.ts`；`useActivityDetail.ts`；`user/CommentsDialog.vue`、`MessagesDialog.vue`；`article/Main.vue`。
- **Changes:**
  1. useApiClient 增加 `mainRequest<T>(path, options)`（`legacyBearerRequest` 的无鉴权兄弟版：`requestJson` + 共享信封 schema + 泛型 payload）；`legacyBearerRequest` 复用同一解析路径。
  2. 表单：
     - Submit.vue — `commentCreateInputSchema.safeParse({ path, content, ...reply 字段 })`；失败 `callHanaMessage(issues[0].message)`；成功发 `parsed.data`；
     - InfoEditor.vue — 保留 diff 构建，`authUpdateMeInputSchema.safeParse(diff)`；密码成对与格式消息来自契约（refine 已内置）；
     - User.vue 登录 — `authLoginInputSchema.safeParse(Object.fromEntries(formData))`；
     - User.vue 注册 — `authRegisterInputSchema.safeParse`（site 空串仍省略，保持现行为）。
  3. 数据消费：comment/index.vue（fetchTotal/fetchComments/handleDelete 改 `mainRequest`/`legacyBearerRequest` 泛型；类型化后按需保留或删除 `?? []`/`|| 0` 防御）；useActivityList（`$fetch` → `mainRequest<ActivityItem[]>`，`Array.isArray` 回退删除）；useArticleSearch；CommentsDialog/MessagesDialog（`payload ?? []` → 类型化）；article/Main.vue——useFetch 泛型标注信封类型（若 Nitro 对 formattedEventHandler 返回类型推断可靠则以推断为准），`whereObj` 类型改用契约 `ArticleFilterQuery`，**不加客户端预校验**（server 已在 Slice 3 严格化，URL 垃圾过滤归 server，行为不变）。
  4. 失败路径语义保持：catch → 现有网络错误文案不变；`requestId` 竞态防护不变。
- **Preserved behavior:** 全部 UI 流程、交互与错误降级路径不变；消息文本从手写文案对齐为契约文案（如「请填写评论内容。」→「评论内容不能为空」），属预期同源化。
- **Dependencies:** Slice 1（共享信封）、Slice 4（类型）。
- **Verification:** typecheck + lint + `pnpm fmt:check`；浏览器手动流：登录/注册（错参即时中文提示）、资料编辑（非法邮箱即时拦截）、发评论/回复（超 2048 即时拦截）、删评论、搜索、活动发布与 feed、文章各列表页；结果记录进 PR。
- **Done when:** main app 侧无 `as ParentCommentItem[]`/`as ArticleSearchItem[]` 等载荷断言残留；手动流全过。

### Slice 6 — 清理（contract 阶段）

- **Outcome:** 被替代的死代码删除；收敛结果可被 grep 证明；全仓质量门通过。
- **Scope:** `shared/utils/date.ts`、`shared/types` 空壳文件、全仓引用面。
- **Changes:**
  1. 删除 `date.ts` 的 `getPublishedAtMonthRange`（执行时先复核零调用，再删）。
  2. 删除已空壳的 `shared/types/articles.d.ts`、`comments.d.ts`、`user.d.ts`、`activity.d.ts`（若 Slice 4 采取「直接改导入点」路线；若保留别名文件则只删文件内被迁类型）。
  3. grep 证明：`#shared/types/(articles|comments|activity|user)` 导入清零；server 无手写 ApiBody；浏览器无 `parseLegacyMainResponse` 手写形状检查。
  4. 根 gate 全量：`pnpm typecheck` / `pnpm lint` / `pnpm fmt:check` / `pnpm test`（api+admin 必须零破坏）。
- **Preserved behavior:** 无行为变化。
- **Dependencies:** 全部前序切片。
- **Verification:** 上述命令 + 完整冒烟一遍（列表/详情/评论全流程/活动/搜索/RSS `/rss.xml` 200）。
- **Done when:** gate 全绿 + grep 证明清单成立。

## Final acceptance criteria

- [ ] main 源码不再存在手写复刻契约的 interface / 运行时校验 / 信封判别（保留白名单：UI 展示类型、main 自有 DTO、`IReplyComment`/`IDeleteComment`、markdown.d.ts 全部、各 feature URL search 宽容解析与 UI 钳制）
- [ ] 12 条有输入的 `/api/*` 路由输入全部契约解析，非法 → 400 + 契约中文消息（行为对齐 ①②③ 生效）
- [ ] 16 处上游调用全部经 `apiEnvelopeSchema(dataSchema)` 校验；上游输出漂移会显式暴露为 500 envelope
- [ ] 四个表单提交前契约校验：2048 上限、邮箱/site 格式、密码成对等规则客户端即时生效，消息与 API 同源
- [ ] legacy 信封定义单点化（`shared/legacy-envelope.ts`），server 与浏览器共用
- [ ] zod 位于 apps/main dependencies
- [ ] URL 宽容语义逐项手动回归不变：Main.vue 页码夹取、`useRecentlyDetailRoute`、archives 默认月、markdown 静态页白名单、`preview` 门控
- [ ] `pnpm typecheck`、`pnpm lint`、`pnpm fmt:check`、`pnpm test` 全绿；main dev 冒烟矩阵全过

## Risks and controls

- 上游实际输出与契约 schema 存在未知漂移（null 语义、枚举外值、字段缺失）→ Slice 2 冒烟矩阵覆盖全部 16 处调用；漂移暴露为 500 envelope；回滚 = revert 该切片提交（切片独立 commit）。
- 严格化后爬虫/陈旧链接拿到 400（行为对齐 ①②③）→ 对齐清单已在计划显式记录；回退方案 = 单路由 `.catch` 默认值，局部、可逆。
- 类型收紧（`ActivityItem` 可选 → 必填）暴露隐性空值访问 → typecheck 逐点修复；确属上游可空则修 contracts schema，禁止在 main 侧放宽。
- main 无单测设施，回归依赖手动 → 冒烟矩阵与 curl 清单模板化写入 PR 描述，逐条勾选；不引入测试框架（deferred）。
- 本地缺 DB/`.env` 无法冒烟 → 执行前按 BUILD.md 准备环境（可选 `pnpm prisma:reset` 灌种子）；环境不可用即阻塞并如实报告，不伪造验证结果。
- contracts 为 workspace dist 消费：若执行中发现类型来自 `dist/index.d.mts` 陈旧，先 `pnpm -F @grey-flowers/contracts run build` 再 typecheck（本轮 contracts 无改动，预期不需要）。

## Deferred scope

- apps/admin 的 9 处表单 R1 与 admin 侧 R2（purpose→maxBytes / MIME 白名单契约化、`authLoginInputSchema` 补 trim）——同模式独立批次。
- main 单测基础设施（vitest + nuxt 环境）——独立决策。
- legacy 信封协议现代化（浏览器直连上游或统一 apiSuccess 信封）——协议重设计，影响面为全站浏览器↔代理边界。
- 时间本地化架构统一（列表/详情混合约定）——展示语义变更，需单独设计。
- 调研报告 R3 全部清单（URL 宽容、本地持久化、UI 钳制，约 40 处）——按共识不属 contract 层职责。
- `music-picker` `SELECT_LIMIT=10` 与 compose `MAX_MUSIC=12` 不一致——admin 内部 UI 钳制，随 admin 批次处理。
