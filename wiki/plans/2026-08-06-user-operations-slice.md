# Grey Flowers 用户运营切片专项设计（切片 6）

## 状态与用途

- 决策日期：2026-08-06
- 状态：构思已与 Hana 讨论定案（决策记录见 §一、§十二），2026-08-06 定稿待实施；实施证据验收后追加（§十三）
- 文档类型：专项设计与实施任务边界（本切片实现的 SSOT）
- 读者：本切片的 contracts、API、Admin 用户工作台、主站迁移确认与验收维护者
- 前置约束：
  - [admin-operational-workflow-slices.md](../design/admin-operational-workflow-slices.md) 的切片 6（用户运营）与本切片 §「评论、用户与概览各自承担不同任务」（用户管理不复制评论处置规则；`UserMessage` 无一级页面）
  - [2026-08-02-grey-flowers-authentication-system.md](./2026-08-02-grey-flowers-authentication-system.md) 的 Principal、`requireRole('ADMIN')`、`requirePrincipal`，以及「管理员用户运营接口如有角色变更，必须调用同一身份模块的『更新角色并撤销全部会话』事务，不能自行更新 `User.role`」
  - [2026-08-01-hono-backend-architecture.md](../design/2026-08-01-hono-backend-architecture.md) 的公开读/管理写两套 Interface 与组合根依赖注入
  - [2026-08-01-react-frontend-architecture.md](../design/2026-08-01-react-frontend-architecture.md) 的 feature 纵切、「不建第二套规则」与多端一致纪律
  - [2026-08-06-comment-moderation-slice.md](./2026-08-06-comment-moderation-slice.md)（切片 5，已完成验收）的 `commentAdminSchema` 投影复用、`/public/users/me/*` 自助读、`Comment.replyToCommentId → SetNull` / `UserMessage.commentId → Cascade` / `UserMessage @@unique` FK 现状、管理 DTO 含 email 不含 AST 纪律、`{ deleted, cascade }` 披露哲学
  - [API_CONVENTIONS.md](../../agent-docs/API_CONVENTIONS.md) 的信封、错误码、DTO 与主站 `apiGet`/`apiMutate` 适配
  - [DATABASE.md](../../agent-docs/DATABASE.md) 的迁移纪律（本切片**不**引入 schema 迁移）
  - [PACKAGES.md](../../agent-docs/PACKAGES.md) 的包边界：API 不得 import `apps/main` 的 `#shared/...` 别名

本文授权：切片 6 涉及的 contracts 新增 `users.ts`（并提升 `auth.ts` 校验器为共享导出）、API 用户模块 `modules/users/`（管理端）/管理路由、auth 模块角色变更原语抽取（`promoteToAdmin` 复用）、Admin 用户 feature（列表 + 详情 + 编辑 + 删除）+ 导航。**不引入 schema 迁移**；**不做**主站代码删除（用户路径已迁移，仅验证收尾）。**不涉及**软删除/封禁、消息管理页面、设备会话管理、密码重置、自动化测试框架或其它切片边界内的残留（`rss.xml`、`server/api/activity/*`）。

本文不授权直接创建路由、DTO 或部署变更之外的实现；每个环节以本文为实施边界。本文基于对旧 `nuxt-admin`（/Users/nonhana/code_life/blog/nuxt-admin）用户管理实现（`server/api/admin/users/*` 四端点、`app/pages/users/index.vue`、`app/components/user/UserCard.vue`）的行为盘点与当前主站用户链路（切片 5 已迁移的 `server/api/user/{comments,messages}.get.ts` 薄适配、认证切片已迁移的 `PATCH /auth/me`）的核实；不复制其 Nuxt API、Prisma 直连或页面内 DTO。

## 一、决策记录（本切片定案，2026-08-06 与 Hana 讨论锁定）

| 决策点 | 决定 | 理由 / 备注 |
| --- | --- | --- |
| schema 迁移 | **不需要**。四组关键 FK 行为已由既有迁移核实（§四 表格）：`Session.userId → Cascade`、`Comment_authorId → Restrict`、`Comment_replyToUserId → SetNull`、`UserMessage_receiverId → Restrict`；子评论级联（`Comment_parentId → Cascade`）、被回复评论引用（`Comment_replyToCommentId → SetNull`）、消息级联（`UserMessage.commentId → Cascade`）也已就绪 | 删除/修改关联由 API 删除事务显式处理（与旧后台同思路）；被删用户的 `replyToUserId` 引用由 DB 层自动 `SET NULL`，**不需要**手工 `updateMany` 清理 |
| 角色变更 seam | auth 模块导出可纳入外层事务的角色原语 `applyRoleChange(userId, role, tx?)`（更新角色 + 同事务 `ROLE_CHANGED` 撤销该用户全部 active Session）；`modules/users` 经构造注入 `AuthService` 调用；`promoteToAdmin`（CLI）改为复用该原语 | 认证设计明文强制：角色变更必须归身份模块、不能自行 `update User.role`；profile 字段与角色变更可同事务提交，保证原子 |
| 删除有资产/快照的用户 | `CONFLICT`（409）拒绝并披露 `Asset.createdById` / `ArticleSnapshot.createdById` 的 Restrict 引用计数；**不做**软删除 | 资产有独立生命周期（切片 1），越权随用户删除违反资源边界；软删除需加 `deletedAt` + 全局过滤，改动面大且超需求 |
| 自我保护 | `/users/:id` 的 `PATCH` 与 `DELETE` 当 `id === principal.userId` → `AUTH_FORBIDDEN`（「请通过个人资料接口修改自己的信息」） | 自我资料/密码编辑已由 `PATCH /auth/me` 覆盖；禁止目标为本人可防「自降角色 → 本人会话被 `ROLE_CHANGED` 撤销 → 请求半途失效」的自锁路径，也避免同一能力双路径 |
| 管理编辑字段 | `{ username?, email?, site?: string\|null, role? }`；**avatar 不可管理端编辑**（系统头像由注册邮箱 weavatar 派生，`/auth/me` 也不允许改 avatar，保持一致）；邮箱变更**不**重构头像 | 与 `/auth/me` 现行为一致；管理端不设密码字段（密码属自助） |
| 角色变更副作用 | 任何角色变更（提升或降级）都撤销该用户全部 active Session（`ROLE_CHANGED`）；角色未变则不撤销 | 对齐认证设计会话状态迁移表；编辑对话框对 role 变更给提示 |
| 删除披露升级 | `DELETE /users/:id` 返回 `{ deleted, cascade }`：`deleted` = 实际删除评论总数（含级联子树），`cascade` = 其中非本人作者的级联子评论数 | 旧后端只披露「及其 N 条评论」（仅本人 authored 数）；升级为切片 5 的 `{ deleted, cascade }` 披露哲学 |
| 评论历史投影 | 详情评论历史条目**复用** `commentAdminSchema`（切片 5），不另造精简投影 | 零新评论契约、跨 feature 一致性；历史都是本人评论，author 冗余无害 |
| 错误码 | **不新增**：`NOT_FOUND`（用户不存在）、`CONFLICT`（用户名/邮箱占用、删 ADMIN、删有资产/快照用户）、`AUTH_FORBIDDEN`（非管理、目标为本人） | 与切片 5「无新增错误码」纪律一致；阻挡语义用 `CONFLICT` + 中文 message 携带披露 |
| 列表/详情 | search(username/email contains insensitive) + role 筛选 + 分页（列表 pageSize≤100、历史 pageSize≤50，采纳旧后端上限）；`orderBy createdAt desc, id desc`（历史 `publishedAt desc, id desc`）；管理 DTO 含 email/role | 保留旧后端搜索/筛选/分页语义；email 因运营需联系用户，与切片 5 管理 DTO 含 email 一致 |
| 主站迁移 | **验证收尾，无代码删除**：`apps/main` 已零 `prisma.user`（grep 核实），`/api/user/{comments,messages}` 已是 API 薄适配，`PATCH /auth/me` 已取代旧 `user/edit` | `server/routes/rss.xml.ts`（`prisma.article`）与 `server/api/activity/*` 属其它切片边界，本切片不触碰 |
| 明确不做 | 软删除/封禁用户、用户消息管理页面、设备会话列表/远程踢出、管理端重置密码、发用户邮件、用户导出、自动化测试框架 | 与切片 5/7 边界清晰；不超出主站运营需求 |

## 二、运营结果与完成边界

管理员完成结果：**检索用户、查看用户资料与互动历史、在明确授权下修改用户资料与角色、删除用户并在危险操作前确认级联影响。**

完成边界（闭环）：

1. **检索与展示**：按用户名/邮箱模糊搜索、按角色筛选、分页排序；管理 DTO 含 `email`/`role`/`commentCount`，不含 `password`。
2. **互动历史**：详情返回用户资料 + 分页评论历史（复用 `commentAdminSchema`），含 `path`、`level`、`replyToUser`、时间；不复制评论处置规则。
3. **权限边界**：全部 `/users` 管理操作 `requireRole('ADMIN')`（非管理员 `AUTH_FORBIDDEN`）；普通用户自助路径（`PATCH /auth/me`、`GET /public/users/me/{comments,messages}`）已存在，本切片不复制、不重开。
4. **敏感字段保护**：`password` 永不进入任何 DTO；`email` 只在管理 DTO 可见（公开/公共 DTO 无 email，切片 5 已确认）。
5. **修改一致性**：`username`/`email` 唯一冲突 → `CONFLICT`；角色变更 → auth 模块「更新角色 + `ROLE_CHANGED` 撤销全会话」事务，不得自行改 `User.role`；目标为本人 → `AUTH_FORBIDDEN`。
6. **删除关联处理**：事务内守卫（不存在 → `NOT_FOUND`；自己 → `AUTH_FORBIDDEN`；ADMIN 账户 → `CONFLICT`；拥有资产/快照 → `CONFLICT` 披露）→ 先清 `UserMessage(receiverId)` → 删本人全部评论（DB 级联子树 + `replyToCommentId` 自动 `SetNull` + 相关 `UserMessage` 自动 `Cascade`）→ 删用户（`sessions` 自动 `Cascade`、`replyToUserId` 自动 `SetNull`）；返回 `{ deleted, cascade }`。
7. **主站路径**：确认 `apps/main` 无 `prisma.user`、无遗留用户业务端点；`/api/user/{comments,messages}` 薄适配保持为自助读。

## 三、行为清单（旧 nuxt-admin 与主站的采纳/调整/拒绝）

| 旧行为 / 主站行为 | 处置 | 结论 |
| --- | --- | --- |
| 列表 `index.get`：search(username/email contains insensitive) + role 筛选 + 分页 page/pageSize(≤100) + `orderBy createdAt desc` + `_count.comments` | 采纳（调整） | 语义照迁；DTO 进统一信封；补 `id desc` 决胜；管理 DTO 含 email/role |
| 详情 `[id].get`：user + 评论历史分页 commentPage/commentPageSize(≤50) + `replyToUser` join | 采纳（调整） | 评论条目复用 `commentAdminSchema`；404 → `NOT_FOUND` 信封 |
| 编辑 `[id].patch`：username/email/**avatar**/site/role + 唯一性检查 + 404 | **调整** | avatar 取消可编辑；唯一性冲突 400 → `CONFLICT` 409；禁止目标为本人；role 变更附加 `ROLE_CHANGED` 撤全会话 |
| 删除 `[id].delete`：事务删用户评论（级联子树、清 `replyToUserId`、清 `UserMessage`）+ 禁删 ADMIN | **调整** | ① 旧代码 `tx.message.deleteMany({ authorId })` 引用的 `message` 模型已不存在，属死代码 → **拒绝**，按当前 `UserMessage`（`receiverId`）清理；② `replyToUserId` 由 DB `SET NULL` 自动处理，不再手工 `updateMany`；③ 补 `Asset.createdById` / `ArticleSnapshot.createdById` Restrict 守卫；④ sessions 自动 Cascade；⑤ 披露升级 `{ deleted, cascade }` |
| 页面 `index.vue`：UCard 列表 + UserCard（头像/用户名/邮箱/角色徽章/日期/评论数/查看/编辑/删除）+ Modal 详情（评论历史分页） | 采纳（调整） | React Aria 组件、AppDialog 一码双端、ConfirmDialog 危险披露、移动筛选 BottomSheet |
| 主站自助读 `/api/user/{comments,messages}` | 采纳（保持） | 切片 5 已迁移为薄适配（`authorized` 脉络），本切片不动 |
| 主站 `user/edit` | 采纳（保持） | 认证切片已用 `PATCH /auth/me` 取代，无遗留 |
| 新能力：角色变更撤会话、删除级联披露、禁止自改/自删 | 新增 | 切片 6 完成边界显式要求（权限边界、删除或修改后的关联处理、敏感字段保护） |

## 四、数据模型与数据库迁移

### 结论：无 schema 变更、无迁移

切片 6 需要的全部外键行为已由既有迁移提供。执行前以 `grep` 核实下列约束（§九.2 验收复核），**不**新增任何迁移。

### 外键行为核实（来源：`packages/db/prisma/migrations/`）

| 外键 | 当前行为 | 迁移来源 | 对切片 6 的影响 |
| --- | --- | --- | --- |
| `Session_userId` | `CASCADE` | `20260802023840_add_auth_sessions` | 删用户自动清会话，无需处理 |
| `Comment_authorId` | `RESTRICT` | `0_init` | 必填；删除事务须先删本人评论 |
| `Comment_replyToUserId` | `SET NULL` | `0_init` | 可选；删用户自动清「被回复目标」引用，**不需手工 updateMany** |
| `Comment_replyToCommentId` | `SET NULL` | `0_init`（切片 5 复核） | 删评论后兄弟回复引用自动清空 |
| `Comment_parentId` | `CASCADE` | `0_init` | 删父评论自动级联子树 |
| `UserMessage_receiverId` | `RESTRICT` | `0_init` | 必填；删除事务须先删收件消息 |
| `UserMessage_commentId` | `CASCADE` | `20260806120000_comment_moderation_fks` | 删评论自动联动清消息 |
| `Asset_createdById` | `RESTRICT`（schema 显式） | `20260801093420_asset_schema_foundation` | 删除守卫：有资产即拒绝 |
| `ArticleSnapshot_createdById` | `RESTRICT`（schema 显式） | `20260802173055_add_article_versioning` | 删除守卫：有快照即拒绝 |

### 删除事务的关联处理总览

```
DELETE /users/:id 单事务内：
1. findUnique → NOT_FOUND
2. id === principal.userId → AUTH_FORBIDDEN（不能删除自己）
3. role === 'ADMIN' → CONFLICT（不能删除管理员账户）
4. _count(createdAssets) + _count(articleSnapshots) > 0 → CONFLICT（披露引用计数）
5. 统计：authored 评论根集 → 级联子树闭包 → { deleted, cascade }
6. userMessage.deleteMany({ receiverId: id })
7. comment.deleteMany({ authorId: id })   // ParentChild CASCADE + replyToCommentId SET NULL + UserMessage CASCADE 均由 DB 落实
8. user.delete({ id })                    // sessions CASCADE + 他人 replyToUserId SET NULL 均由 DB 落实
```

步骤 6-8 的顺序是硬约束：必填外键（`authorId`、`receiverId`）必须先清引用再删本人；可选外键（`replyToUserId`、`replyToCommentId`）依赖 DB `SET NULL` 自动处理。

### 明确

- 不引进软删除；不重写存量行；不触碰其它领域表。
- 未来若有人手工重写这些 FK 的 referential action，删除事务行为必须重验（记录于 §十一）。

## 五、Contracts 变更（`packages/contracts/src/`）

### 5.1 提升 `auth.ts` 校验器为共享导出

`users.ts` 与 `auth.ts` 共用同一套字段校验，避免第二套规则：将 `auth.ts` 内的私有 `usernameSchema`、`emailInputSchema`、`emailSchema`、`siteSchema` 导出（`users.ts` `import` 复用）；`role` 用 `z.enum(['USER', 'ADMIN'])`（命名 `userRoleSchema`，与切片 5 注释中的角色枚举对齐）。

### 5.2 新增 `users.ts`，并在 `index.ts` 再导出

```ts
// —— 管理投影：合计评论数，无 password ——
export const userAdminSummarySchema = z.object({
  id: z.number().int().positive(),
  email: z.string().email(),
  username: z.string(),
  avatar: z.string(),
  site: z.string().nullable(),
  role: userRoleSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  commentCount: z.number().int().min(0),
}).strict();
export type UserAdminSummary = z.infer<typeof userAdminSummarySchema>;

// —— 列表查询（管理）——
export const userListQuerySchema = z.object({
  search: z.string().max(100).optional(),          // username/email contains insensitive
  role: userRoleSchema.optional(),                 // 角色筛选
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
}).strict();
export type UserListQuery = z.infer<typeof userListQuerySchema>;

export const userAdminListDataSchema = z.object({
  items: z.array(userAdminSummarySchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(100),
}).strict();
export type UserAdminListData = z.infer<typeof userAdminListDataSchema>;
export const userAdminListResponseSchema = apiSuccessSchema(userAdminListDataSchema);

// —— 详情：资料 + 分页评论历史（复用 commentAdminSchema）——
export const userAdminDetailQuerySchema = z.object({
  commentPage: z.coerce.number().int().min(1).default(1),
  commentPageSize: z.coerce.number().int().min(1).max(50).default(10),
}).strict();
export type UserAdminDetailQuery = z.infer<typeof userAdminDetailQuerySchema>;

export const userAdminDetailDataSchema = z.object({
  user: userAdminSummarySchema,
  comments: z.object({
    items: z.array(commentAdminSchema),
    total: z.number().int().min(0),
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1).max(50),
  }).strict(),
}).strict();
export type UserAdminDetailData = z.infer<typeof userAdminDetailDataSchema>;
export const userAdminDetailResponseSchema = apiSuccessSchema(userAdminDetailDataSchema);

// —— 编辑（管理）——avatar 不在可编辑集合；site: null 清空 ——
export const userUpdateInputSchema = z.object({
  username: usernameSchema.optional(),
  email: emailInputSchema.optional(),
  site: siteSchema.nullable().optional(),          // string | null
  role: userRoleSchema.optional(),                 // 变更触发 ROLE_CHANGED 撤全会话
}).strict();
export type UserUpdateInput = z.infer<typeof userUpdateInputSchema>;

export const userAdminResponseSchema = apiSuccessSchema(userAdminSummarySchema);

// —— 删除结果（级联披露）——
export const userDeleteResultSchema = z.object({
  deleted: z.number().int().min(0),   // 实际删除评论总数（含级联子树）
  cascade: z.number().int().min(0),   // 其中非本人作者的级联子评论数
}).strict();
export type UserDeleteResult = z.infer<typeof userDeleteResultSchema>;
export const userDeleteResponseSchema = apiSuccessSchema(userDeleteResultSchema);
```

- 全部 `.strict()`；默认不暴露 Prisma 类型；时间 ISO（主站/Admin 本地化由展示层承担）。
- `commentAdminSchema` 从 `comments.ts` 再导出引用，无重复定义。

## 六、apps/api 变更

### 6.1 auth 模块角色原语（`modules/auth/service.ts`）

在 `AuthService` 新增（`promoteToAdmin` 改为复用）：

```ts
/** 更新角色并在同事务内撤销该用户全部 active Session（ROLE_CHANGED）。
 *  tx 缺省时自建 $transaction；传入时可纳入外层事务（users.update 同事务原子）。 */
async applyRoleChange(
  userId: number,
  role: 'USER' | 'ADMIN',
  tx?: PrismaTransactionLike,
): Promise<'unchanged' | 'updated'>
```

要点：
- 事务内 `user.update({ role })` + `session.updateMany({ userId, revokedAt: null, expiresAt: { gt: now } }, { revokedAt: now, revokeReason: 'ROLE_CHANGED' })`；角色未变 → `'unchanged'`（不撤销会话）。
- `PrismaTransactionLike` 收敛为 `user`/`session` 两个委托的最小接口，兼容 `PrismaClient` 与事务客户端（对齐 Prisma 7 客户端事务类型）。
- `promoteToAdmin(email)` 改为「按 email 查用户 → 调 `applyRoleChange`」，保持 CLI 的 `not_found`/`already_admin`/`promoted` 语义不变。

### 6.2 `modules/users/`（routes.ts / service.ts / contracts.ts）

路由保持薄：验证输入 → 调 service → 返回已映射 DTO；业务规则不进入 Admin/Main。`modules/users/service.ts` 不读取原始 HTTP Event。

### 6.3 路由表

| 端点 | 认证 | 输入 | 成功 `data` | 特殊规则 |
| --- | --- | --- | --- | --- |
| `GET /users` | ADMIN | `userListQuerySchema` | `userAdminListDataSchema` | search(username/email contains insensitive) + role + 分页；`orderBy createdAt desc, id desc`；`_count.comments` |
| `GET /users/:id` | ADMIN | `userAdminDetailQuerySchema` | `userAdminDetailDataSchema` | 不存在 → `NOT_FOUND`；评论历史 `orderBy publishedAt desc, id desc` |
| `PATCH /users/:id` | ADMIN | `userUpdateInputSchema` | `userAdminSummarySchema` | 目标本人 → `AUTH_FORBIDDEN`；username/email 唯一（排除目标自身）→ `CONFLICT`；role 变更 → auth `applyRoleChange`（同事务撤全会话） |
| `DELETE /users/:id` | ADMIN | 无 body | `userDeleteResultSchema` | 守卫（§四）→ 事务级联 → 返回 `{ deleted, cascade }` |

挂载（`apps/api/src/app.ts`）：

```ts
app.route('/users', createUserRoutes(dependencies));
```

`bootstrap/dependencies.ts`：`users: new UserService(prisma, environment, auth)` 加入 `AppDependencies`（`UserService` 构造注入 `AuthService`，角色事务归身份模块）。整组路由沿用现有管理组的 `requireRole('ADMIN')` 门禁（与 `/comments` 一致）。

### 6.4 service 要点（沿用 `$transaction` + `ApiError` 风格）

- `list(query)`：`where = { ...(role ? { role } : {}), ...(search ? { OR: [{ username: { contains, mode: 'insensitive' } }, { email: { contains, mode: 'insensitive' } }] } : {}) }`；select 含 `_count.comments`；DTO 构造 `commentCount`。
- `detail(id, query)`：`findUnique`（无 → `NOT_FOUND`）select 同列表；`comment.findMany({ where: { authorId: id }, skip, take, orderBy: { publishedAt: 'desc', id: 'desc' }, select: commentAdminSelect })` + `comment.count`；DTO 复用 `commentAdminSchema` 映射。
- `update(principal, id, input)`（单事务）：
  1. `findUnique` 无 → `NOT_FOUND`；`id === principal.userId` → `AUTH_FORBIDDEN`（自我管理走 `/auth/me`）。
  2. `email`/`username` 给出时用 `findFirst({ where: { id: { not: id }, OR: [...] } })` 查重 → 冲突 `CONFLICT`。
  3. `user.update`（只更新出现的字段；`site: null` 清空）。`avatar` 不在可编辑集合。
  4. 若 `input.role` 给出且 ≠ 当前角色 → 同事务调用 `auth.applyRoleChange(id, role, tx)`；角色未变 → 不撤销。
  5. `isUniqueConstraint` 兜底映射 `CONFLICT`。返回管理 DTO。
- `remove(principal, id)`（单事务）：
  1. `findUnique` 无 → `NOT_FOUND`；`id === principal.userId` → `AUTH_FORBIDDEN`；`role === 'ADMIN'` → `CONFLICT`（不能删除管理员账户）。
  2. `createdAssets.count` + `articleSnapshots.count` 任一 > 0 → `CONFLICT`（message 披露「该用户还创建了 N 个资产 / M 个文章快照，无法删除」）。
  3. 统计：`authored = comment.findMany({ where: { authorId: id }, select: { id } })`；`closure = collectCascadeCommentIds(tx, authoredIds, { authorId: true })`（平移切片 5/旧后台子树闭包思路，返回含 `authorId` 的记录）；`deleted = |closure|`；`cascade = |{ c ∈ closure : c.authorId !== id }|`。
  4. 清理：`userMessage.deleteMany({ receiverId: id })` → `comment.deleteMany({ authorId: id })` → `user.delete({ id })`；`sessions`/`replyToUserId`/`replyToCommentId`/`UserMessage.commentId` 由 DB 落实（§四）。
  5. 返回 `{ deleted, cascade }`。

`collectCascadeCommentIds` 作为 `users/service.ts` 私有工具（small、非共享包；不预建 `shared`/`utils`）。

### 6.5 错误码

仅复用现有一级：`VALIDATION_FAILED`（400）、`AUTH_REQUIRED`（401）、`AUTH_FORBIDDEN`（403：非管理、目标为本人）、`NOT_FOUND`（404）、`CONFLICT`（409：用户名/邮箱占用；删 ADMIN；删有资产/快照用户）。无新增错误码。

## 七、apps/admin 变更

### 7.1 路由与导航

- `routes/route-tree.tsx`：新增 `/users`（lazy 页，`lazyPage` 与切片 5 `commentsRoute` 同法）。
- `app/shell/console-shell.tsx`：SECTIONS「互动」组追加 `{ icon: Users, label: '用户', path: '/users' }`（与「评论」同组）；移动端 `MoreSheet` 加入「用户」入口（底部 tab 保持 文章/动态/资产/更多 不变）。

### 7.2 `app/api/users.ts` + `ApiClient`

```ts
export const createUsersApi = (http: Http) => ({
  list: (query: UserListQuery): Promise<UserAdminListData> =>
    http.get('/users', { authenticated: true, schema: userAdminListResponseSchema, searchParams: listSearchParams(query) }),
  detail: (id: number, query?: UserAdminDetailQuery): Promise<UserAdminDetailData> =>
    http.get(`/users/${id}`, { authenticated: true, schema: userAdminDetailResponseSchema, searchParams: detailSearchParams(query) }),
  update: (id: number, input: UserUpdateInput): Promise<UserAdminSummary> =>
    http.patch(`/users/${id}`, { authenticated: true, json: input, schema: userAdminResponseSchema }),
  remove: (id: number): Promise<UserDeleteResult> =>
    http.delete(`/users/${id}`, { authenticated: true, schema: userDeleteResponseSchema }),
});
```

`ApiClient` 增加 `readonly users`（`apps/admin/src/app/api/index.ts`）。

### 7.3 `features/users/`

- `list-page.tsx` —— `PageHeader「用户」+ MetaLine 总数`；筛选条：`SearchInput`（用户名/邮箱）、`SelectField`（role：全部/USER/ADMIN）、重置；防抖 300ms + 分页（page/pageSize=20）；`RowSkeleton` / `EmptyState`（附「注册用户会在这里显示」）/ 失败重试（沿用 activities 列表的 `requestKey` + `cancelled` 模式）。
- `user-card.tsx` —— 头像（weavatar URL `img`，复用 `Avatar` 语义）、username、email、ADMIN Pin（对齐评论的 ADMIN 角色 Pin）、`createdAt`（`formatDateTime`）、「N 条评论」角标、操作：`详情` / `编辑`（`Pencil`）/ `删除`（`Trash2`）。
- `detail-dialog.tsx` —— `AppDialog size="lg"`（桌面居中 / 移动底抽屉）：资料头（头像/username/email/site 外链 `ExternalLink` 打开 / role / createdAt / 评论数）+ 评论历史分页（行内 path 面包屑 `font-mono text-2xs` 截断 + `publishedAt` + `replyToUser/@username` 引用行 + 「在访客页打开」外链 `SITE_URL + path`）；评论条目复用轻量行，不引入 `comments` feature 的重型卡片。
- `edit-dialog.tsx` —— `AppDialog`：`TextField`（username/email）、`TextField`（site，可清空）、`SelectField`（role，仅 USER/ADMIN）；当 role 选择与当前不同时显示提示「变更角色将使其全部会话立即失效，需重新登录」；保存 → 成功 `toast.success`；`CONFLICT` 经响应 `message`/`fields` 展示（用户名/邮箱已被占用）；移动端表单随键盘避让（`use-keyboard-inset`）。
- `delete-confirm` —— `ConfirmDialog`（`isDestructive`）：披露「将删除用户『{username}』及其发布的 {commentCount} 条评论；其评论下的全部子回复（可能包含其他用户的回复）与相关通知将一并删除，不可恢复。」；确认后调 `remove` → `toast.success`（用返回值披露「已删除 N 条评论（含 M 条其他用户的回复）」）；失败（`CONFLICT`：删管理员 / 有资产快照）用响应 `message` 展示。

### 7.4 设计语言校验

全部复用 `@/ui/index.js` 原语（`PageHeader/PageBody/Panel/MetaLine/EmptyState/Skeleton/RowSkeleton/AppDialog/BottomSheet/ConfirmDialog/TextField/SearchInput/SelectField` 等）；不引入新主题变量、不新造样式；`lucide-react` 图标；移动端沿用「悬浮元素 + 全屏 sheet + 键盘避让」范式。

## 八、apps/main 迁移

本切片为**验证收尾**，无代码删除、无新端点：

1. grep `prisma.user`、`userMessage`、`commentSelectObj` 于 `apps/main`（排除 `.nuxt`）→ 零残留（已核实，仅剩 `rss.xml.ts` 的 `prisma.article`，属内容/概览切片边界，本切片不触碰）。
2. `server/api/user/{comments,messages}.get.ts` 切片 5 已成为 API 薄适配（`apiMutate` → `/public/users/me/*`），保持为认证自助读；确认主站调用点（`CommentsDialog.vue`/`MessagesDialog.vue`）仍走 `apiClient.legacyBearerRequest`，无 `?id=` 旧用法。
3. 确认 `PATCH /auth/me` 已取代主站旧 `user/edit`（认证切片完成，`server/api/user/edit*` 不存在）。
4. `server/routes/rss.xml.ts` 与 `server/api/activity/*` 的 Prisma/适配状态不因本切片改变。

## 九、验收与证据（按切片文档 §每个切片的交付闭环）

人工验收矩阵至少覆盖：

1. **静态门禁**：`pnpm typecheck`、`pnpm lint`、`pnpm fmt:check`、`pnpm build`（全 workspace）绿。
2. **数据库现状核实（无迁移）**：grep migration SQL 确认 §四 表格九项 FK 行为（`Session_userId`=c、`Comment_authorId`=a/RESTRICT、`Comment_replyToUserId`=n/SET NULL、`Comment_replyToCommentId`=n、`Comment_parentId`=c、`UserMessage_receiverId`=a、`UserMessage_commentId`=c、`Asset_createdById`/`ArticleSnapshot_createdById`=a）；临时库构造「删用户 → replyToUserId 自动清空、sessions 自动清、评论级联与 UserMessage 联动」样例复验。
3. **API 管理接口（本地 dev）**：
   - `GET /users`：search(username/email contains insensitive)/role 筛选、分页、`commentCount`；非管理 token → `403 AUTH_FORBIDDEN`。
   - `GET /users/:id`：资料 + 评论历史分页（条目含 path/level/replyToUser、publishedAt desc）；不存在 → 404。
   - `PATCH /users/:id`：改 email/site 生效；用户名/邮箱冲突 → 409；role USER→ADMIN 且 ADMIN→USER 均撤销该用户全部 active Session（`revokeReason=ROLE_CHANGED`，其 access 立即失效）；角色不变 → 不撤销；目标为本人 → 403；不存在 → 404；非管理 → 403；管理 DTO 无 `password`/`avatar` 可编辑字段。
   - `DELETE /users/:id`：删无评论普通用户 → `{ deleted: 0, cascade: 0 }`；删有评论用户 → `{ deleted: authored+子树, cascade: 他人回复数 }` 正确；再删同 id → 404；删 ADMIN → 409；删拥有资产/快照的用户 → 409（message 披露计数）；删自己 → 403；非管理 → 403；删后他人 `replyToUserId` 指向该用户的评论自动 `NULL`、`sessions` 清空、相关 `UserMessage` 联动清理。
4. **敏感字段**：grep 全部 users DTO/响应，无 `password`；管理 DTO 含 email，公开/公共 DTO 无 email。
5. **Admin 浏览器（1440×900 与 375×780）**：
   - 导航：桌面 rail「互动·用户」、移动 MoreSheet 含「用户」到位（底部 tab 保持 文章/动态/资产/更多）。
   - 列表：共 N 位用户 MetaLine、搜索（防抖）/role 筛选/分页、加载/空/失败重试、USER/ADMIN 徽章与 Pin。
   - 详情：`AppDialog`（桌面居中 / 移动底抽屉）资料头 + site 外链 + 评论历史分页；行内回复引用与「在访客页打开」外链正常。
   - 编辑：用户名/邮箱冲突经提示展示；site 可清空；role 变更提示「全会话失效」；保存 toast 与列表刷新。
   - 删除：`ConfirmDialog` 披露 authored 评论数与级联警告；确认后 toast 用返回值披露实际 `deleted`/`cascade`；删管理员/有资产经 `CONFLICT` message 展示。移动端 375px 全流程（筛选 sheet、详情/编辑抽屉、键盘避让）可走通。
6. **主站**：§八 四项验证通过（`prisma.user` 零残留、薄适配保持、`user/edit` 不存在、`rss.xml`/`activity` 出界不动）。

## 十、实施任务拆分（按序，均待授权）

0. **阶段 0 验证**：① FK 行为 grep 核实表（§九.2）；② 临时库构造删用户样例复验 DB 级联/SetNull/Cascade；③ 确认 `apps/main` 零 `prisma.user`（已核实，形成证据）；④ auth `applyRoleChange` 可纳入外层事务的类型方案（Prisma 7 事务客户端）核查。
1. contracts：`users.ts` + `auth.ts` 校验器共享导出 + `index.ts` 再导出。
2. auth：`applyRoleChange` 原语；`promoteToAdmin` 复用。
3. api：`modules/users/`（routes/service/contracts）+ `dependencies.ts` 注入 + `app.ts` 挂载 `/users`。
4. admin：`app/api/users.ts` + ApiClient.users；`features/users/`（list-page/user-card/detail-dialog/edit-dialog/删除确认）+ shell「互动·用户」+ route-tree。
5. 主站：§八 验证收尾。
6. 验收：§九 全矩阵人工验收 + 证据附录（追加到本文 §十三）。

## 十一、风险与已记录的后顾

- **`replyToUserId` 依赖 DB `SET NULL`**（`0_init`）：删除不再手工 `updateMany`。若未来重建/重写该 FK 默认行为，删除事务必须重验——记录为「迁移若触及相关 FK，需重跑 §九.2/3 删除样例」。
- **删用户会级联删除「他人子回复」**（与切片 5 删除语义全局一致）：确认对话框已披露；运营需知这是既定级联语义，不是误伤。
- **角色变更全会话失效**：包括被提升为 ADMIN 的用户也需重新登录（对齐认证设计会话状态迁移表）。若管理员把唯一 ADMIN 降级，系统可能暂时无 ADMIN——由 CLI `promote-admin`（不删角色、幂等）兜底，风险接受；编辑对话框已给提示。
- **`Asset.createdById` / `ArticleSnapshot.createdById` Restrict**：当前只有 ADMIN 能创建资产/文章快照，而 ADMIN 不可删除，守卫主要防假设性边界（如未来放开普通用户上传）；仍保留守卫并按 `CONFLICT` 披露，避免 P2003 碰壁。
- **`PATCH /users/:id` 空 body**：不设「至少一个字段」约束（对齐 `/auth/me` 行为），空 PATCH 为无害 no-op（仅 `@updatedAt` 变化）；UI 始终提交全字段，风险低。
- **`message` 模型死代码**：旧后端 `tx.message.deleteMany({ authorId })` 引用的 `message` 已从 schema 移除，本切片按 `UserMessage`（`receiverId`）清理，不复刻死代码。
- **无自动化测试框架（设计定案）**：交互路径依赖 §九.5 人工矩阵与证据记录。

## 十二、本次讨论定案记录（2026-08-06）

- 无 schema 迁移：四组关键 FK 行为既已就绪（§四），`replyToUserId` 由 DB `SET NULL` 自动处理；删除事务只显式处理必填外键（authored 评论、receiver 消息）与守卫。
- 角色变更 seam：auth 模块导出可纳入外层事务的 `applyRoleChange(userId, role, tx?)`，users 经构造注入调用，`promoteToAdmin` 复用——认证设计「不能自行 update User.role」的落点。
- 删除有资产/快照用户 → `CONFLICT` 拒绝披露，不做软删除（资产有独立生命周期）。
- 自我约束：`/users/:id` PATCH/DELETE 禁目标本人（自我走 `/auth/me`），防自降角色锁死；编辑 DTO 不含 avatar/password（avatar 服务端从邮箱派生、密码自助）。
- 删除披露 `{ deleted, cascade }`（cascade = 非本人作者的级联子评论）；评论历史复用 `commentAdminSchema`。
- 主站迁移 = 验证收尾（零 `prisma.user` 已核实），`rss.xml`/`activity` 出界不动。

## 十三、实施证据附录（2026-08-06 实施并验收）

> 全量证据均为实测记录；实施未做任何契约修正。

### §九.1 静态门禁（全 workspace，root 脚本）

- `pnpm typecheck` ✅、`pnpm lint` ✅、`pnpm fmt:check` ✅、`pnpm build` ✅（`tsdown`/`vite`/`nuxt` 全通过）。
- 附带发现：`oxlint --fix` 曾顺手折叠一处无关既有代码（`features/music/list-page.tsx` 的传参换行），已 `git checkout` 还原，改动面保持在本切片。

### §九.2 数据库现状核实（无迁移）

- 九项 FK 行为 `grep` 核实（migration SQL）：
  `Session_userId=CASCADE`（20260802023840）、`Comment_authorId=RESTRICT`（0_init）、`Comment_replyToUserId=SET NULL`（0_init）、`Comment_replyToCommentId=SET NULL`（0_init + 20260806120000）、`Comment_parentId=CASCADE`（0_init）、`UserMessage_receiverId=RESTRICT`（0_init）、`UserMessage_commentId=CASCADE`（20260806120000）、`Asset_createdById=RESTRICT`（20260801093420）、`ArticleSnapshot_createdById=RESTRICT`（20260802173055）。
- 临时库复验：建 `greyflowers_slice6_demo`，`prisma:migrate:deploy` 重放全部既有迁移（**零新迁移**），按 §四 删除事务同序执行后校验：A 的父评论+子评论+他人子回复共删、C4（他人回复）计入 cascade、指向被删用户的 `replyToUserId` 自动 `SET NULL`、本人 `Session` 自动级联清除、`UserMessage`（评论 Cascade）联动清除——**PASS**。验证后已 `DROP DATABASE` 清理。
- `apps/main` grep `prisma.user`/`userMessage`/`commentSelectObj` 零源码残留（仅 `.nuxt/.output` 构建产物含组件名，非业务引用）。

### §九.3 API 管理接口矩阵（本地 dev，`localhost:2408`）

在 `greyflowers_admin_test` 上注册切片 6 测试账户做全矩阵，事后清理：

- `GET /users`：`search=slice6-user` 返回含 2 名匹配用户、`commentCount=2` 正确；`role=ADMIN&search=slice6` 命中 slice6-admin；无匹配搜索 total=0；分页/排序（createdAt desc, id desc）正常。非管理 token → `403 AUTH_FORBIDDEN`。
- `GET /users/21`：详情资料 + 评论历史分页（pageSize=2 → `{total:2}`、publishedAt desc）；不存在 id → `404 NOT_FOUND`。
- `PATCH /users/:id`：仅改 `site` 生效（值持久化）；`username` 冲突 → `409 CONFLICT`（message「用户名或邮箱已被占用」）；不存在 → 404；目标本人 → `403 AUTH_FORBIDDEN`（message「请通过个人资料接口修改自己的信息」）；非管理 → 403。角色 USER→ADMIN：响应 role 更新，旧 access token 立即 `401 AUTH_REQUIRED`（DB 复核 Session `revokedAt` 置位 + `revokeReason=ROLE_CHANGED`）；再 PATCH 同角色 → **不撤销**（重登会话仍有效）；ADMIN→USER 同样撤会话。管理 DTO 响应字段 = `{id,email,username,avatar,site,role,createdAt,updatedAt,commentCount}`，**无 `password`、无 `avatar` 可编辑字段**。
- `DELETE /users/:id`：不存在 → 404；目标本人 → 403；删管理员 → `409 CONFLICT`（「不能删除管理员账户」）；有资产用户 → `409`（「该用户还创建了 1 个资产，无法删除」）；无评论用户 → `{deleted:0,cascade:0}`；有评论用户（父+母+子、含他人回复）→ `{deleted:3,cascade:1}` 与预期闭包一致；删后复议 → 404。DB 复核：被删用户的 `UserMessage(receiverId)` 先行清理、`Session` 级联删净、他人 `replyToUserId` 指向该用户的评论自动 `SET NULL`、相关 `UserMessage` 联动消失——**PASS**。

### §九.4 敏感字段

- grep 全部 users DTO/响应 schema：`packages/contracts/src/users.ts` 与 `apps/api/src/modules/users/*` 均无 `password`；管理 DTO 含 `email`、公开投影（comments `commentAuthorPublicSchema`）无 email。运行时列表响应键名已核无 password。

### §九.5 Admin 浏览器矩阵（1440×900 桌面 + 375×780 移动，headless Chromium + a11y 断言）

- 桌面：rail「互动」组出现「用户」入口；`/users` 列表显示「共 N 位用户」MetaLine、12 张卡片、每卡头像/用户名/email/ADMIN Pin/注册时间/「N 条评论」角标/详情·编辑·删除。
- 搜索（300ms 防抖）`slice6rb` → 1 用户；role 筛选「管理员」→ 6 用户且全带 ADMIN 徽章；「重置」恢复 12。
- 详情：`AppDialog` 资料头（email、注册于、共 0 条评论）+ 评论历史空态「还没有评论」；编辑写入 site 后详情出现「主页」外链 `https://example.com`。
- 编辑：username/email/site 三字段 + role 下拉（占位「不修改」）；改 site 保存 → toast「已保存用户资料。」→ 对话框关闭 + 列表刷新；role 与当前不同时出现「变更角色将使其全部会话立即失效，该用户需重新登录。」（未保存即关闭）。
- 删除：`ConfirmDialog` 标题「删除用户「slice6rb」？」+ 消息披露 0 条评论与级联警告；确认 → toast「已删除用户「slice6rb」及 0 条评论。」，列表归零。
- 移动 375×780：底部 tab 保持 文章/动态/资产/更多；「更多」sheet 含「用户」入口；列表正常；详情以**底抽屉**（react-modal-sheet）呈现；删除全流程（确认 + toast）走通；表单随 `AppDialog` sheet 键盘避让。

> 注意：矩阵早期曾出现「列表加载失败」，根因是测试脚本经 DB 直插了一个 18 字符 username 的超契约账号（注册层 16 上限拦截的是 HTTP 路径），响应 strict schema 如实拒绝该非法记录——非产品缺陷；清理该记录后列表恢复正常。

### §九.6 主站

- `apps/main` 零 `prisma.user`/`userMessage` 源码引用（已核实）；`/api/user/{comments,messages}.get.ts` 保持为 `apiMutate` → `/public/users/me/*` 的**认证自助读薄适配**（无 `?id=` 旧用法）；`PATCH /auth/me` 在位、`user/edit` 不存在；`rss.xml` 与 `server/api/activity/*` 本切片未触碰。

### 实施修正记录

- 无契约修正。仅实现细节与本切片决策一致化：`UserService` 构造注入 `auth`（环境参数未使用故未注入）；重复冲突的 `CONFLICT` 附加中文 `message` 供运营端透出。

### 测试数据清理

- 矩阵账户（`slice6-user/user2/admin2/noop/asset/rolecheck/browser-del/rb/mobdel`）均已删除或清理；保留 `slice6-admin@test.dev` 作为后续开发/验收的 ADMIN 账户；临时库 `greyflowers_slice6_demo` 已销毁。
