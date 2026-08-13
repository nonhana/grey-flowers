# Grey Flowers 评论处置切片专项设计（切片 5）

## 状态与用途

- 决策日期：2026-08-06
- 状态：构思已与 Hana 讨论定案（决策记录见 §一、§十二），2026-08-06 实施完成并验收（证据见 §十三）
- 文档类型：专项设计与实施任务边界（本切片实现的 SSOT）
- 读者：本切片的 contracts、API、Admin 评论工作台、主站迁移与验收维护者
- 前置约束：
  - [admin-operational-workflow-slices.md](../design/admin-operational-workflow-slices.md) 的切片 5（评论处置）与本切片 §「评论、用户与概览各自承担不同任务」（关联作者 ≠ 用户管理；`UserMessage` 无一级页面）
  - [2026-08-01-hono-backend-architecture.md](../design/2026-08-01-hono-backend-architecture.md) 的公开读/管理写两套 Interface
  - [2026-08-01-react-frontend-architecture.md](../design/2026-08-01-react-frontend-architecture.md) 的 feature 纵切、「不建第二套规则」与多端一致纪律
  - [2026-08-05-activity-publishing-slice.md](./2026-08-05-activity-publishing-slice.md)（切片 4，已完成验收）的 `commentCount` 只读投影、DateTime ISO 契约、主站薄适配范式与「评论完整读写仍归切片 5」交接
  - [2026-08-02-grey-flowers-authentication-system.md](./2026-08-02-grey-flowers-authentication-system.md) 的 Principal 与 `requireRole('ADMIN')`、`requirePrincipal`
  - [API_CONVENTIONS.md](../../agent-docs/API_CONVENTIONS.md) 的信封、错误码、DTO 与主站 `apiGet` 适配
  - [PACKAGES.md](../../agent-docs/PACKAGES.md) 的包边界：API 不得 import `apps/main` 的 `#shared/...` 别名

本文授权：切片 5 涉及的 contracts 新增 `comments.ts`、**一条 schema 迁移**（`Comment.replyToCommentId → onDelete: SetNull`、`UserMessage.commentId → onDelete: Cascade`、`UserMessage @@unique([receiverId, commentId])`）、API 评论模块（管理 + 公开 + 站内通知 + 邮件）、Admin 评论 feature（列表 + 会话视图 + 回复 + 批量处置）+ 导航、主站评论读写路径迁移与邮件能力迁移。**不涉及**用户资料与权限边界（切片 6）；不引入自动化测试框架；不新增隐藏/折叠/置顶等新产品能力。

本文不授权直接创建路由、DTO、数据库迁移或部署变更之外的实现；每个环节以本文为实施边界。本文基于对旧 `nuxt-admin`（/Users/nonhana/code_life/blog/nuxt-admin）评论实现与当前主站评论链路（`apps/main/server/api/comments/*`、`server/api/user/{comments,messages,send-message}*`、`server/utils/{comment-markdown,comment-serializer,mailer}.ts`）的行为盘点与逐字段核对；不复制其 Nuxt API、Prisma 直连或页面内 DTO。

## 一、决策记录（本切片定案，2026-08-06 与 Hana 讨论锁定）

| 决策点 | 决定 | 理由 / 备注 |
| --- | --- | --- |
| 「查看上下文」 | **不 join 标题**：评论归属是自由字符串 `path`（文章 = `route.path`，动态 = `/recently?id=<id>`），Schema 无外键可靠反查页面标题。上下文 = path 面包屑 + 「在访客页打开」外链（`siteUrl + path`）+ **同 path 会话树**（PARENT + 全部 CHILD） | 加 `targetArticleId/targetActivityId` 需回填 + 改切片 2/4 写路径，越界；上下文体验由会话视图承担 |
| FK 隐患（replyToCommentId） | `Comment.replyToCommentId → onDelete: SetNull` | 现网真实 P2003：兄弟回复指向被删评论时删除失败（见 §四） |
| FK 隐患（消息引用） | `UserMessage.commentId → onDelete: Cascade` | 评论消失，「你被回复了」的通知一并失效，语义合理 |
| UserMessage 去重 | 加 `@@unique([receiverId, commentId])` schema 约束 + 写入用 `createMany skipDuplicates` | 应用层查重脆弱；同一（接收者, 回复评论）至多一条通知 |
| 通知生成落点 | **统一收进 API 评论服务**：用户公开回复/管理员回复，只要 `目标评论作者 ≠ 回复者本人`，事务内建 `UserMessage` + 提交后 best-effort 发邮件 | 旧后台回复漏建 UserMessage；主站「发消息」是前端手搓的第二个调用，一并删除 |
| 邮件能力 | **从 `apps/main` 迁入 `apps/api`**：移植 `mailer.ts`（Resend + 模板），站点名/站点址不再依赖 `#shared/data/meta`（API 不可 import 主站别名），改为模块常量 + 可选 env 覆盖 | 主站业务端点关闭；`RESEND_API_KEY`/`RESEND_FROM`/`HANA_MAIL_ENABLE` 在根 `.env.example` 已预留，补 API env schema 读取 |
| 评论正文 | 受限 Markdown **原样移植**（14 标签白名单、禁 heading/html/image/table、`comment-` clobber 前缀、2048 上限） | 与主站 `comment-markdown.ts` 逐字对齐；2048 由 Zod 拦成 `VALIDATION_FAILED`（不再用 413） |
| 管理 DTO | 作者含 `email/site/role`（运营需联系作者）；**不含 `contentMarkdown`**（Admin 不渲染 AST，正文给纯文本 + 截断/展开） | 与切片 4「管理 DTO 不含 AST」纪律一致；公开 DTO 不含 email（现状如此） |
| 公开写路径 | `POST /public/comments`（发/回复，服务端算 `level`）、`DELETE /public/comments/:id`（仅作者）、`GET /public/users/me/{comments,messages}`（**仅看自己**） | 修复主站现存漏洞：`/api/user/messages?id=<任意>` 匿名可取任何用户数据 |
| 删除语义 | 处置 = 硬删除级联（无软删除，无隐藏/折叠）；删除 PARENT 级联删子树（DB 约束 + 事前确认披露子树规模） | 与主站/旧后台一致；schema 迁移后 DB 层自动解决两个 FK |
| 邮件失败 | **不阻断评论/通知**：UserMessage 是契约（事务内），邮件 best-effort（catch + warn 日志） | 旧 `send-message.post` 邮件抛错会让整个相邻调用 500，体验差 |
| 路由 | 管理 `/comments`（`requireRole('ADMIN')`）；公开 `/public/comments`、`/public/users`（`requirePrincipal`） | 遵循现有路由分组纪律 |
| 明确不做 | 评论隐藏/折叠/置顶、`UserMessage` 管理页面、用户资料管理、自动化测试框架 | 与切片 6 边界清晰；不新增超出主站运营需求的产品能力 |

## 二、运营结果与完成边界

管理员完成结果：**检索评论、查看评论上下文、回复评论（自动通知被回复用户）、单条或批量删除评论，并在危险操作前确认级联影响。**

完成边界（闭环）：

1. **评论树正确性**：`level` 由服务端按 `parentId` 决定（PARENT/CHILD 两级，回复 CHILD 时父归并到其父）；`parentId`/`replyToUserId`/`replyToCommentId` 指向必须存在（不存在 → `NOT_FOUND`）；`path` 原样透传。
2. **删除级联完整**：删 PARENT 级联删子树（DB Cascade）；被删集合（含子树）被其它评论 `replyToCommentId` 引用 → 自动 `SetNull`（不再 P2003）；指向被删评论的 `UserMessage` 自动级联清理（不再 P2003）；删除事务内统计并返回 `{ deleted, cascade }`。
3. **通知生成**：任何回复（公开或管理）在目标作者非本人时事务内建 `UserMessage`，同一（接收者, 回复评论）不重复；邮件 best-effort 发送不阻断主流程。
4. **公开/管理分离**：公开返回与主站 `CommentItem`/`ParentCommentItem` 逐字段一致（含 `contentMarkdown`、本地化时间由主站 adapter 承担）；管理返回含作者 email/site/role 与 `childrenCount`。
5. **管理员权限**：全部管理写操作 `requireRole('ADMIN')`（非管理员 `AUTH_FORBIDDEN`）；公开写操作 `requirePrincipal`；作者删除仅本人（他人 `AUTH_FORBIDDEN`）。
6. **多端一致**：Admin 评论工作台桌面 rail/居中对话框、移动 MoreSheet/底抽屉，同一组件。
7. **主站迁移**：`server/api/comments/*` 与 `server/api/user/{comments,messages,send-message}*` 迁到 API（读为薄适配、写为 Bearer 透传）；删 `comment-markdown.ts`、`comment-serializer.ts`、`mailer.ts`、`prismaShortcut.ts` 评论部分；`#shared/types/comment.d.ts` 与评论区渲染组件保持，适配层换数据源。

## 三、行为清单（旧 nuxt-admin 与主站的采纳/调整/拒绝）

| 旧行为 / 主站行为 | 处置 | 结论 |
| --- | --- | --- |
| 列表：只列 PARENT + children + childrenCount；筛选 path（contains insensitive）/search（content）/startDate/endDate；分页 page/pageSize | 采纳（调整） | 保留筛选与分页；管理 DTO 带 `childrenCount` 供删除确认披露 |
| 单删：`delete` 级联 + 返回「已删除评论及其 N 条回复」 | 采纳（调整） | 事务内先统计子树再删；返回 `CommentDeleteResult { deleted, cascade }`；依赖 schema 迁移修复两个 FK 隐患 |
| 批删：ids ≤100 + deleteMany 级联 | 采纳（调整） | 同单删语义、事务化；确认框披露受影响总数 |
| 回复：`parentId` 归一（PARENT → 自身；CHILD → 其父）+ `replyToUserId`/`replyToCommentId` 指向目标 | 采纳（调整） | 同语义；**补 UserMessage + 邮件通知**（旧后台漏了通知） |
| 回复长度 ≤2000、trim | 采纳（调整） | 契约统一为 ≤2048（对齐公开发评论上限），字段由 Zod 拦 |
| 主站发评论：`post.post` 服务端算 `level`、`parseCommentMarkdown`、`contentMarkdown` | 采纳 | 语义原样迁入 API 公开端点；`send-message` 客户端二次调用删除 |
| 主站作者删自己评论：仅作者可删 | 采纳（调整） | 迁 `DELETE /public/comments/:id`；403 → `AUTH_FORBIDDEN` |
| 主站列表/计数：`list.get`/`count.get` | 采纳 | 迁 `GET /public/comments/list`、`/count`；主站只留薄适配 |
| 主站用户消息/评论：`user/messages.get`/`user/comments.get` 按 `?id=` 匿名可读任意用户 | **调整** | 迁 `GET /public/users/me/*`；`requirePrincipal` + 仅 self（修复隐私漏洞）；前端调用点改为带 token 的自助读取 |
| 主站 `send-message.post`：前端传 `{receiverId, commentId}` 手搓建消息 + 邮件 | **拒绝** | 通知是回复的服务端副作用，不由浏览器手搓；端点删除，逻辑归 API 评论服务 |
| 邮件 `mailer.ts`：Resend + 模板 + `HANA_MAIL_ENABLE` | 采纳（迁移） | 原样迁入 API；siteName/siteUrl 改模块常量，不 import 主站 `#shared/data/meta` |
| 评论隐藏/折叠/置顶 | 拒绝 | 超出主站运营需求，不做 |
| Admin 查看上下文视图 | 新增 | 切片文档明确要求（旧后台没有）；实现为会话视图（§七） |

## 四、数据模型与数据库迁移

### 修改（`packages/db/prisma/schema.prisma` + 一次迁移 `comment-moderation-fks`）

```prisma
model Comment {
  // —— 其余字段不动 ——
  replyToComment Comment? @relation("ReplyToComment", fields: [replyToCommentId], references: [id], onDelete: SetNull)  // ← 由默认 NO ACTION 改为 SetNull
  userMessage    UserMessage[]
}

model UserMessage {
  id         Int     @id @default(autoincrement())
  receiverId Int
  commentId  Int
  comment    Comment @relation(fields: [commentId], references: [id], onDelete: Cascade)  // ← 默认 NO ACTION 改为 Cascade
  receiver   User    @relation(fields: [receiverId], references: [id])                      // 保持不动（删用户在切片 6 决定）
  @@unique([receiverId, commentId])   // ← 新增，防重复通知
}
```

### 为什么（翻出当前两个真实 FK 隐患）

- `Comment.replyToCommentId` 无 `onDelete` → Postgres 默认 `NO ACTION`。现网触发路径：B 是 C 的子评论、A 回复 B（`A.parentId = C.id`、`A.replyToCommentId = B.id`，A、B 为同级兄弟）。单独删 B（作者自删或管理员删）时，`A` 不在 B 的级联子树里，但 `A.replyToCommentId` 仍指向 B → 删 B 必 P2003（500）。
- `UserMessage.commentId` 无 `onDelete` → 任何「你被回复了」消息指向的评论被删 → P2003。

迁移改为 `SetNull`（被回复评论没了，回复降级为无引用，主站渲染对 `replyToComment: null` 需确认已有降级，见 §八）与 `Cascade`（评论消失，相关通知一并失效）后，两处删除由 DB 层自动解决，删评论不再需要手工逐行清引用，服务端删除逻辑显著简化。

### 迁移规则

1. 在一次性临时库以 `pnpm --filter @grey-flowers/db run prisma:migrate:dev -- --create-only --name comment-moderation-fks` 生成迁移草稿。
2. 审查并手工校正 SQL：
   - `ALTER TABLE "Comment" DROP CONSTRAINT "Comment_replyToCommentId_fkey"; ALTER TABLE "Comment" ADD CONSTRAINT "Comment_replyToCommentId_fkey" FOREIGN KEY ("replyToCommentId") REFERENCES "Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;`
   - `ALTER TABLE "UserMessage" DROP CONSTRAINT "UserMessage_commentId_fkey"; ALTER TABLE "UserMessage" ADD CONSTRAINT "UserMessage_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;`
   - `ALTER TABLE "UserMessage" ADD CONSTRAINT "UserMessage_receiverId_commentId_key" UNIQUE ("receiverId","commentId");`
   - **去重前置守卫**：在加唯一约束前执行 `SELECT "receiverId","commentId",count(*) FROM "UserMessage" GROUP BY 1,2 HAVING count(*)>1;` 若存在重复，先 `DELETE FROM "UserMessage" a USING "UserMessage" b WHERE a."id" > b."id" AND a."receiverId"=b."receiverId" AND a."commentId"=b."commentId";`（保留最小 id）。临时库先验证。
   - 不触碰其它领域表、不重写存量评论行。
3. `pnpm prisma:generate` 后提交 schema + 迁移 SQL。

## 五、Contracts 变更（`packages/contracts/src/`）

### 新增 `comments.ts`，并在 `index.ts` 再导出

```ts
// —— 层级与作者投影 ——
export const commentLevelSchema = z.enum(['PARENT', 'CHILD']);
export const commentAuthorPublicSchema = z.object({   // 公开：与主站公开 select 逐字段一致（无 email）
  id: z.number().int().positive(),
  username: z.string(),
  site: z.string().nullable(),
  avatar: z.string(),
}).strict();
export const commentAuthorAdminSchema = z.object({    // 管理：运营需联系作者
  id: z.number().int().positive(),
  username: z.string(),
  email: z.string(),
  avatar: z.string(),
  site: z.string().nullable(),
  role: z.enum(['USER', 'ADMIN']),
}).strict();
export const commentParentRefSchema = z.object({
  id: z.number().int().positive(),
  content: z.string(),
  authorId: z.number().int().positive(),
}).strict();
export const commentReplyToUserSchema = z.object({
  id: z.number().int().positive(),
  username: z.string(),
}).strict();
export const commentReplyToCommentSchema = z.object({
  id: z.number().int().positive(),
  content: z.string(),
}).strict();

// —— 单条评论 DTO（公开）——
export const commentPublicSchema = z.object({
  id: z.number().int().positive(),
  path: z.string(),
  content: z.string(),
  contentMarkdown: z.any().nullable(),   // mdc AST Json 透传（主站渲染）
  level: commentLevelSchema,
  author: commentAuthorPublicSchema,
  parent: commentParentRefSchema.nullable(),
  replyToUser: commentReplyToUserSchema.nullable(),
  replyToComment: commentReplyToCommentSchema.nullable(),
  publishedAt: z.iso.datetime(),
  editedAt: z.iso.datetime(),
}).strict();
export const commentPublicTreeSchema = commentPublicSchema.extend({
  children: z.array(commentPublicSchema),   // children 按 publishedAt asc（对齐主站）
}).strict();
export type CommentPublic = z.infer<typeof commentPublicSchema>;
export type CommentPublicTree = z.infer<typeof commentPublicTreeSchema>;

// —— 单条评论 DTO（管理，无 contentMarkdown）——
export const commentAdminSchema = z.object({
  id: z.number().int().positive(),
  path: z.string(),
  content: z.string(),
  level: commentLevelSchema,
  author: commentAuthorAdminSchema,
  parent: commentParentRefSchema.nullable(),
  replyToUser: commentReplyToUserSchema.nullable(),
  replyToComment: commentReplyToCommentSchema.nullable(),
  publishedAt: z.iso.datetime(),
  editedAt: z.iso.datetime(),
}).strict();
export const commentAdminTreeSchema = commentAdminSchema.extend({
  children: z.array(commentAdminSchema),
  childrenCount: z.number().int().min(0),   // 供删除确认披露
}).strict();
export type CommentAdmin = z.infer<typeof commentAdminSchema>;
export type CommentAdminTree = z.infer<typeof commentAdminTreeSchema>;

// —— 输入 ——
export const commentCreateInputSchema = z.object({
  path: z.string().min(1, 'path 不能为空').max(300),
  content: z.string().min(1, '评论内容不能为空').max(2048, '评论内容不能超过 2048 字').trim(),
  parentId: z.number().int().positive().optional(),
  replyToUserId: z.number().int().positive().optional(),
  replyToCommentId: z.number().int().positive().optional(),
}).strict();
export type CommentCreateInput = z.infer<typeof commentCreateInputSchema>;

export const commentReplyInputSchema = z.object({
  content: z.string().min(1, '回复内容不能为空').max(2048, '回复内容不能超过 2048 字').trim(),
}).strict();
export type CommentReplyInput = z.infer<typeof commentReplyInputSchema>;

export const commentsBatchDeleteInputSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1, '请提供要删除的评论 ID').max(100, '单次最多删除 100 条评论'),
}).strict();
export type CommentsBatchDeleteInput = z.infer<typeof commentsBatchDeleteInputSchema>;

// —— 删除结果（含级联披露）——
export const commentDeleteResultSchema = z.object({
  deleted: z.number().int().min(0),   // 实际删除总数（含级联子树）
  cascade: z.number().int().min(0),   // 其中级联删除的子评论数
}).strict();
export type CommentDeleteResult = z.infer<typeof commentDeleteResultSchema>;

// —— 列表查询（管理）——
export const commentListQuerySchema = z.object({
  search: z.string().max(50).optional(),                 // content contains insensitive
  path: z.string().max(300).optional(),                  // path contains insensitive（保留旧语义）
  authorId: z.coerce.number().int().positive().optional(),
  startDate: z.iso.date().optional(),                    // publishedAt >= startDate 当日 00:00（本地时区由 API 校准）
  endDate: z.iso.date().optional(),                      // publishedAt <= endDate 当日 24:00
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
}).strict();
export type CommentListQuery = z.infer<typeof commentListQuerySchema>;

export const commentListDataSchema = z.object({
  items: z.array(commentAdminTreeSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(100),
}).strict();
export type CommentListData = z.infer<typeof commentListDataSchema>;
export const commentListResponseSchema = apiSuccessSchema(commentListDataSchema);
export const commentDeleteResponseSchema = apiSuccessSchema(commentDeleteResultSchema);
export const commentAdminResponseSchema = apiSuccessSchema(commentAdminSchema);

// —— 公开读 ——
export const commentCountSchema = z.object({
  totalCount: z.number().int().min(0),
  parentCount: z.number().int().min(0),
}).strict();
export type CommentCount = z.infer<typeof commentCountSchema>;
export const commentPublicListQuerySchema = z.object({
  path: z.string().min(1).max(300),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),   // 对齐主站默认 6/10 区间
}).strict();
export const commentPublicListResponseSchema = apiSuccessSchema(z.array(commentPublicTreeSchema));
export const commentCountResponseSchema = apiSuccessSchema(commentCountSchema);
export const commentPublicResponseSchema = apiSuccessSchema(commentPublicSchema);
export const commentMeResponseSchema = apiSuccessSchema(z.array(commentPublicSchema));     // messages
export const commentMeTreeResponseSchema = apiSuccessSchema(z.array(commentPublicTreeSchema)); // my comments
```

## 六、apps/api 变更

### 6.1 迁移评论 Markdown（`modules/comments/comment-markdown.ts`）

原样移植 `apps/main/server/utils/comment-markdown.ts`：`commentSchema`（14 标签 `p/br/strong/em/del/a/blockquote/ul/ol/li/code/pre/span/style`；`a` 的 className/href/target(_blank|_self)/rel；`code` className；`pre` shiki 属性 + style + tabindex；`span` className/style 正则；href protocols http/https/mailto；clobberPrefix `comment-`）、`getUnsupportedCommentMdTypes` + `validateCommentMarkdownAst`（拒 heading/html/image/table，文案「发布失败：评论不支持标题、HTML、图片、表格」对应项，cause 哨兵区分规则失败与真实异常）、`parseCommentMarkdown`（`@nuxtjs/mdc/runtime` `parseMarkdown`：`contentHeading:false`、`toc:false`、`remark-mdc:false`、`comment-markdown-validator` 插件、`rehype-external-links` `_blank + noopener/noreferrer/nofollow/ugc`、`rehype-sanitize` + `commentSchema`、`rehype-raw:false`）。

差异（由 API 世界修正）：
- 输入长度校验上移到契约 Zod（`VALIDATION_FAILED` 400），本函数不再返回 413 分支；保留「校验器拒绝 → 带中文 message 的标记失败」与「异常 → 记日志」两条路径，错误码由 service 映射为 `VALIDATION_FAILED` / `INTERNAL_ERROR`。
- 阶段 0 确认 `rehype-external-links` 在 API 解析为字符串插件名时可解析（若不在依赖树则补依赖，同 `rehype-sanitize` 先例）。

### 6.2 邮件迁移（`modules/comments/mailer.ts`）

原样移植 `apps/main/server/utils/mailer.ts`：`MailContext`、`escapeHtml`、`renderHtml`（收藏级模板：`你在 GreyFlowers 的评论有新回复`、引用原文、CTA `siteUrl + path + #comments`）、`sendCommentReplyMail({ skipped, messageId })`（`HANA_MAIL_ENABLE !== 'true'` 或缺 key 时返回 `{ skipped: true }`；`RESEND_FROM` 缺省 `GreyFlowers <no-reply@caelum.moe>`）。

差异（迁移点）：
- **不再 import `#shared/data/meta`**（API 不可越包边界）。`siteName`/`siteUrl` 改为模块常量 `SITE_NAME = 'GreyFlowers'`、`SITE_URL = 'https://caelum.moe'`（与 API `env.ts` 既有的 `productionOrigins` 硬编码同源同例）。
- 环境值从 `ApiEnvironment` 注入（构造时传入）而非模块级读 `process.env`：`MAIL_ENABLE`（= `HANA_MAIL_ENABLE === 'true'`，缺省 false）、`RESEND_API_KEY?`、`RESEND_FROM?`。Resend 客户端按需惰性初始化。
- 发送为 **best-effort**：`sendCommentReplyMail` 抛错由 service catch + `logger.warn`，不阻断评论创建/通知。

### 6.3 API 环境（`apps/api/src/env.ts`）

`environmentSchema` 追加可选字段（discriminatedUnion 各分支）：

```ts
const mailEnable = z.literal('true').or(z.literal('false')).default('false');
const resendApiKey = z.string().optional();
const resendFrom = z.string().optional();
// environment: { MAIL_ENABLE, RESEND_API_KEY, RESEND_FROM }
```

根 `.env.example` 已预留 `HANA_MAIL_ENABLE`、`RESEND_API_KEY`、`RESEND_FROM`（无需改动 `.env.example`；仅确认注释/占位与 API 字段一致）。`createDependencies` 注入 `CommentService`。

### 6.4 路由表

| 管理（ADMIN，挂 `/comments`） | 公开（匿名 / principal，`/public/comments`、`/public/users`） |
| --- | --- |
| `GET /` 列表（search/path contains/authorId/日期区间 + 分页；PARENT 树 + childrenCount） | `GET /list?path&page&pageSize`（PARENT + children asc；公开 DTO） |
| `POST /:id/reply`（Admin 回复 → CHILD + 通知） | `GET /count?path`（totalCount/parentCount） |
| `DELETE /:id`（单删 + 级联披露） | `POST /`（发/回复；principal；服务端算 level + 通知 + 邮件） |
| `DELETE /`（批量 ≤100，body `{ ids }`） | `DELETE /:id`（仅作者 + 级联 + 引用清理） |
| | `GET /users/me/comments`（principal；自己的评论，children take 2） |
| | `GET /users/me/messages`（principal；自己的消息，take 10） |

挂载（`apps/api/src/app.ts`）：

```ts
app.route('/comments', createCommentRoutes(dependencies));
app.route('/public/comments', createCommentPublicRoutes(dependencies));
app.route('/public/users', createCommentUserRoutes(dependencies));
```

`bootstrap/dependencies.ts`：`comments: new CommentService(prisma, environment, logger)` 加入 `AppDependencies`。

### 6.5 service 要点（`modules/comments/service.ts`，沿用 `$transaction` + `ApiError` 风格）

- **通知原语** `notifyReceiver(tx, receiverId, replyCommentId, path)`：`receiverId === replierId` → 跳过；`tx.userMessage.createMany({ data: [{ receiverId, commentId: replyCommentId }], skipDuplicates: true })`（依赖新唯一约束）；返回是否已通知（供邮件决定）。
- **邮件原语** `sendReplyMail(comment, receiver)`：提交后 best-effort，`logger.warn` 吞错；每回复尝试调 `mailer.sendCommentReplyMail`。
- `createPublic(principal, input)`（单事务）：`parentId`/`replyToUserId`/`replyToCommentId` 给出时校验目标评论/用户存在（缺失 → `NOT_FOUND`）；`contentMarkdown = parseCommentMarkdown(content)`（失败 → `VALIDATION_FAILED` + 中文文案）；`level = parentId ? CHILD : PARENT`；create + 通知（若 `replyToCommentId` 且目标作者非本人）+ 提交后邮件。返回公开 DTO。
- `removeOwn(principal, id)`（单事务）：存在（`NOT_FOUND`）；`authorId !== principal.userId` → `AUTH_FORBIDDEN`；先 `childrenCount`（直属或子树）再 `comment.delete`（DB Cascade 清理子树 + `UserMessage`，`SetNull` 释放外部引用）；返回 `{ deleted, cascade }`。
- `replyAdmin(principal, id, input)`（单事务）：目标存在（`NOT_FOUND`）；`parentId = target.level === 'PARENT' ? target.id : target.parentId!`；`level='CHILD'`、`replyToUserId = target.authorId`、`replyToCommentId = target.id`、`path = target.path`；create + 通知（目标作者非本人）+ 邮件。返回管理 DTO。
- `removeAdmin(id)` / `removeAdminBatch(ids)`：同 `removeOwn` 语义，无作者限制；批删先 `count where id in ids`（0 → `NOT_FOUND`），事务内逐条统计 `childrenCount` 汇总后 delete；返回 `{ deleted, cascade }`。
- `listAdmin(query)`：`where = { level:'PARENT', authorId?, path:{contains, mode:'insensitive'}?, content:{contains: search, insensitive}?, publishedAt: { gte, lte }? }`；`orderBy publishedAt desc, id desc`；select 含 `_count.children`；DTO 构造 `childrenCount`、children 完整数组（按 publishedAt asc）。
- `listPublic(query)`：`where { path: exact, level:'PARENT' }`，children 按 publishedAt asc；分页；时间 ISO 出、本地化交主站 adapter。
- `countPublic(path)`：`parentCount = count({ path, level:'PARENT' })`、`totalCount = count({ path })`。
- `listMyComments(principal)`：`where authorId = principal.userId`，children `take: 2` asc，`take: 10`，publishedAt desc；`listMyMessages(principal)`：`userMessage.findMany({ where receiverId, select comment, take: 10, orderBy comment.publishedAt desc })`。
- **错误码**：新增用 `VALIDATION_FAILED`、`NOT_FOUND`、`AUTH_FORBIDDEN`、`AUTH_REQUIRED`；无新增错误码。

## 七、apps/admin 变更

### 7.1 路由与导航

- `routes/route-tree.tsx`：新增 `/comments`（lazy 页）。
- `app/shell/console-shell.tsx`：`SECTIONS` 新增「互动」组 `{ icon: MessagesSquare, label: '评论', path: '/comments' }`；移动端 `MoreSheet` 加入「评论」入口（tab 保持 文章/动态/资产/更多 不变）。
- `features/comments/` 目录。

### 7.2 `app/api/comments.ts` + `ApiClient`

```ts
export const createCommentsApi = (http: Http) => ({
  list: (query: CommentListQuery): Promise<CommentListData> =>
    http.get('/comments', { authenticated: true, schema: commentListResponseSchema, searchParams: listSearchParams(query) }),
  reply: (id: number, input: CommentReplyInput): Promise<CommentAdmin> =>
    http.post(`/comments/${id}/reply`, { authenticated: true, json: input, schema: commentAdminResponseSchema }),
  remove: (id: number): Promise<CommentDeleteResult> =>
    http.delete(`/comments/${id}`, { authenticated: true, schema: commentDeleteResponseSchema }),
  removeBatch: (ids: number[]): Promise<CommentDeleteResult> =>
    http.delete('/comments', { authenticated: true, json: { ids }, schema: commentDeleteResponseSchema }),
});
```

`ApiClient` 增加 `readonly comments`（`index.ts`）。已核验：管理端 `http.delete` 经 `HttpRequestOptions.json` → `ky` 透传（`apps/admin/src/app/api/http.ts` 的 `delete` 走统一 `request` + `send`，`json` 分支存在）；API 端 `parseBody` 用 `request.json()`（`apps/api/src/lib/parser.ts`），与 HTTP 方法无关——`DELETE /comments` 带 body 全链路可行。

### 7.3 `features/comments/`

- `list-page.tsx` —— `PageHeader「评论」+ MetaLine 总数`；筛选条：`SearchInput`（内容）、`TextField`（path，placeholder「页面路径，如 /recently?id=12」）、`TextField`（作者 ID）、`SelectField` 或日期对（startDate/endDate，日期区间可选）、重置；防抖 300ms + 分页（`page/pageSize=20`）；加载 `RowSkeleton` / 空 `EmptyState`（附「发布评论后这里会显示」）/ 失败重试（沿用 activities list-page 的 `requestKey` + `cancelled` 模式）；顶部勾选操作栏（选中计数 + 「删除所选」）。
- `comment-card.tsx` —— 行内勾选框（仅 PARENT 可勾，CHILD 随父树）、作者头像（`AssetImage`/`Avatar` 语义）+ username + email（管理）Pin、`publishedAt`（`formatDateTime`）、path 面包屑（`font-mono text-2xs` 截断）+ 「打开页面」外链（`href = SITE_URL + path`，`target=_blank`，`ExternalLink` 图标）、正文（`line-clamp-3` + 展开/收起，「展开」渲染全文纯文本）、`childrenCount !== 0` 时「N 条回复」角标、操作：`会话` / `回复`（`MessageSquareReply`）/ `删除`（`Trash2`）。
- `session-dialog.tsx`（**会话视图 = 查看上下文的载体**）—— `AppDialog size="2xl"`（桌面居中 / 移动底抽屉，一码双端）：头部 path + 「在访客页打开」外链 + 总条数；正文区 = PARENT 评论卡 + children 列表（每条显示 `replyToUser/@username` 或 `replyToComment` 引用引用行 + 内容 + 时间 + 回复/删除）；底部最小回复框（`TextAreaField` + 发送）快捷回复 PARENT。复用 `comment-card` 的行内操作。
- `reply-dialog.tsx` —— `AppDialog`：引用块（原评论 `blockquote` 样式）+ `TextAreaField`（`placeholder`「写下你的回复…」）+ 受限 MD hint（「MD 支持：**、*、~~、[a]()、> 、- 、code · 不支持标题/表格/图片/HTML · 最多 2048 字」）+ 发送；成功 → `toast.success('已回复，将通知 <username>')` + 关闭 + 刷新。
- `delete-confirm` —— `ConfirmDialog`（`isDestructive`）：单删披露「将删除该评论及其 {childrenCount} 条回复（作者：{username}）」；批删披露「将删除所选的 {N} 条评论及其全部回复，不可恢复」。确认后调 remove/removeBatch → `toast.success`（用返回值披露实际 `deleted` 数）+ 刷新列表/会话。
- 移动端：筛选条 → `BottomSheet` 收纳筛选；行操作可点；`session-dialog` 即底抽屉（AppDialog 行为）；键盘避让复用 `use-keyboard-inset`。

### 7.4 设计语言校验

全部复用 `@/ui/index.js` 原语（`PageHeader/PageBody/Panel/MetaLine/EmptyState/Skeleton/RowSkeleton/AppDialog/BottomSheet/ConfirmDialog/TextField/TextAreaField/SearchInput/StatusReadout` 等）；不引入新主题变量、不新造样式；`lucide-react` 图标；移动端沿用「悬浮元素 + 全屏 sheet + 键盘避让」范式。

## 八、apps/main 迁移

### 8.1 `server/utils/api-gateway.ts` 新增写/认证适配器

```ts
export async function apiMutate<T>(
  method: 'POST' | 'PATCH' | 'DELETE',
  path: string,
  options: { body?: unknown; event: H3Event },
): Promise<T> {
  // 构造 url（无 query）；headers: { accept, ...(body ? { 'content-type': 'application/json' } : {}) }
  // 读取 event.headers.get('Authorization')，原样转发给 API（主站 auth middleware 已先校验 principal）
  // fetch(..., { method, headers, body: body ? JSON.stringify(body) : undefined })
  // body.success → return body.data；否则 throw ApiGatewayError(status, code, message)
}
```

`apiGet` 保持不动（读路径向后兼容切片 2/4）。

### 8.2 评论四个端点薄适配

- `server/api/comments/list.get.ts`：改 `apiGet<CommentPublicTree[]>('/public/comments/list', { path, page, pageSize })` → ISO 时间 `formatDateTimeYmdHms` 本地化 → 原 `{ payload }` 信封；分页默认语义保持（适配层传 1/10，主站前端本就传 1~10）。删除 `getComments` 与 Prisma select。
- `server/api/comments/count.get.ts`：改 `apiGet<CommentCount>('/public/comments/count', { path })` → `{ payload }`。
- `server/api/comments/post.post.ts`：改 `apiMutate<CommentPublic>('POST', '/public/comments', { body: { path, content, parentId, replyToUserId, replyToCommentId }, event })`；成功 → `{ payload }`；`ApiGatewayError && code === 'VALIDATION_FAILED'` → 原 400 envelope（`statusMessage` 用 API message）；`AUTH_REQUIRED`/`AUTH_FORBIDDEN` → 透传原 401/403。
- `server/api/comments/delete.post.ts`：改 `apiMutate<CommentDeleteResult>('DELETE', `/public/comments/${commentId}`, { event })` → `{ payload }`；`NOT_FOUND` → 404 envelope；`AUTH_FORBIDDEN` → 403 envelope。

删除主站端 `useZodVerify` 验证与 `parseCommentMarkdown`/Prisma 直读（规则归 API）。

### 8.3 user 三端点：互动读自助化、发消息删除

- `server/api/user/comments.get.ts` / `messages.get.ts`：改为认证自助读（不再接受 `?id=`）——`apiMutate('GET', '/public/users/me/comments' | '/public/users/me/messages', { event })` → ISO 本地化 → `{ payload }`。将二者加入 `server/utils/blackList.ts`（`/api/user/comments`、`/api/user/messages`），移除 `/api/user/send-message`（该端点删除）。
- `server/api/user/send-message.post.ts`：**删除**。通知逻辑归 API 评论服务（§6.5）；`mailer.ts` 迁 API 后主站不再调用。

### 8.4 前端调用点顺迁

- `app/components/comment/Submit.vue`：发评论经 `apiClient.legacyBearerRequest('/api/comments/post', ...)` 不变（服务端适配器转发）；**删除**发布成功后的 `legacyBearerRequest('/api/user/send-message', ...)` 手动建消息块（含 `receiverId !== self` 守卫——此守卫移入 API 服务端）与 `send-message` 相关导入。
- `app/components/comment/index.vue`：`fetchTotal`/`fetchComments` 的 `$fetch` 不变（公开读经适配器）；删除改用 `apiGet` 后请求参数不变。`delete` 的 `legacyBearerRequest('/api/comments/delete', ...)` 不变。对 `replyToCommentId` 为 null 的渲染降级核对一次（`Item.vue` 的 `isReplyToChildComment` 对 `replyToComment = null` 不误判），必要时补一行判空——属迁移顺带修正，不是新功能。
- `app/components/user/CommentsDialog.vue` / `MessagesDialog.vue`：`$fetch('/api/user/...', { query: { id } })` 改为 `apiClient.legacyBearerRequest('/api/user/comments' | '/api/user/messages')`（读自己，不传 id）。

### 8.5 删除主站遗留

- 删 `server/utils/comment-markdown.ts`、`comment-serializer.ts`、`mailer.ts`。
- `prismaShortcut.ts`：删 `commentSelectObj`/`childCommentArgs`/`parentCommentArgs` 及其 Comment 相关导出（切片 4 明确留给本切片）。
- 阶段 0 / 收尾 grep `prisma.comment`、`commentSelectObj`、`userMessage` 于 `apps/main`，确认零残留。
- `#shared/types/comment.d.ts` 与评论区渲染组件（`Item.vue` 等）保持，仅数据源经适配器。

## 九、验收与证据（按切片文档 §每个切片的交付闭环）

人工验收矩阵至少覆盖：

1. 静态门禁：`pnpm typecheck`、`pnpm lint`、`pnpm fmt:check`、`pnpm build`（全 workspace）绿。
2. 迁移（临时库先验）：`receiverId/commentId` 唯一索引建成、重复行去重守卫生效、`Comment_replyToCommentId_fkey` = `confdeltype=n`（SET NULL）、`UserMessage_commentId_fkey` = `confdeltype=c`（CASCADE）；构造「A 是 C 的子、B 回复 C 后 A 回复 B（兄弟指向）」样例：删 B → A 的 `replyToCommentId` 置 NULL、不报错；删被 `UserMessage` 引用的评论 → 消息级联清理。
3. API 管理接口（本地 dev）：
   - `GET /comments`：search/path contains/authorId/日期区间筛选、分页、PARENT 树 + childrenCount；USER token → `403 AUTH_FORBIDDEN`。
   - `POST /comments/:id/reply`：回复 PARENT/CHILD 的 `parentId`/`replyTo*` 归一正确；目标不存在 → 404；内容空/超 2048/含 `# 标题` `![](url)` `<div>` `| 表格 |` → `400 VALIDATION_FAILED` 中文文案；target 作者非本人 → `UserMessage` 落库 ≤1 条（重复回复同一评论不再新增，skipDuplicates 生效）；本人回复自己 → 无消息。
   - `DELETE /comments/:id`：返回 `{ deleted, cascade }`（有子时为 1+N）；该评论的 `UserMessage` 被清；他人回复指向它的 `replyToCommentId` 置 NULL；再次删除同 id → 404。
   - `DELETE /comments`：ids 空/超 100 → 400；全不存在 → 404；混合存在 + 不存在 → 删存在的并可披露。
4. 公开接口：
   - `POST /public/comments`：无 token → 401；PARENT/CHILD/回复归一正确；发评论回复他人 → `UserMessage` + （`MAIL_ENABLE=true` 时）邮件；内容规则同管理。
   - `DELETE /public/comments/:id`：非作者 → 403；作者删 PARENT 级联子树 UI 不含（主站端自行 removeComment 计数一致）。
   - `GET /public/comments/list|count`：与主站 `CommentItem/ParentCommentItem` 逐字段一致（含 `contentMarkdown`）；path 精确匹配；children asc。
   - `GET /public/users/me/comments|messages`：仅返回本人数据；无 token → 401；他人 id 无效（无该参数）。
5. Admin 浏览器（1440×900 与 375×780）：
   - 导航：桌面 rail「互动·评论」、移动 MoreSheet「评论」到位。
   - 列表：加载/空/失败重试、搜索（防抖）、path/作者/日期筛选、分页、勾选批量操作栏。
   - 会话视图：点卡片 → AppDialog（桌面居中 / 移动底抽屉）展示 PARENT + children 树与 path 外链；Tree 内原地回复/删除生效并刷新。
   - 回复：dialog 引用块 + MD hint + 2048 上限；成功 toast 披露「将通知 <username>」。
   - 删除：`ConfirmDialog` 披露「及其 N 条回复」；批删披露总数；成功后列表刷新、计数正确。移动端 375px 全流程（筛选 sheet、会话抽屉、键盘避让）可走通。
6. 主站：评论区读写经 API 返回（SSR 与浏览器）；作者删自己评论、回复他人通知、user 对话框自助读正常；`/api/user/messages?id=` 移除后无人可用旧参数；`blackList` 生效；`prismaShortcut` 评论部分删除后编译关闭（apps/main typecheck 绿）。`#shared/types/comment.d.ts` 与渲染组件零改动。

## 十、实施任务拆分（按序，均待授权）

0. **阶段 0 验证**：① `rehype-external-links` 在 API 依赖树可解析（字符串插件名）；② 临时库迁移草稿：唯一索引 + 两个 FK 改写 + 去重守卫；③ 构造删评论 P2003 样例复现（迁移前）→ 迁移后 SetNull/Cascade 复验；④（已核验，不需再做）`http.delete` json body 与 Hono `parseBody` 全链路可行；⑤ `apiMutate` 透传 Bearer 在 API `requirePrincipal` 闭环。
1. contracts：`comments.ts` + `index.ts` 再导出。
2. 迁移：`comment-moderation-fks`（FK 改写 + 唯一约束 + 去重守卫）；`pnpm prisma:generate`。
3. api：`env.ts` 邮件字段 + `modules/comments/`（comment-markdown/mailer/contracts/service/comment-user-routes/routes）+ `app.ts`/`dependencies.ts` 挂载。
4. admin：`app/api/comments.ts` + ApiClient；`features/comments/`（list-page/comment-card/session-dialog/reply-dialog/批量）+ shell「互动」导航 + route-tree。
5. 主站：`api-gateway.ts` 加 `apiMutate`；评论四端点 + user 三端点迁移；`Submit.vue`/`CommentsDialog`/`MessagesDialog` 顺迁；`blackList` 更新；删 `comment-markdown.ts`/`comment-serializer.ts`/`mailer.ts`/`prismaShortcut.ts` 评论部分。
6. 验收：§九全矩阵人工验收 + 证据附录（追加到本文 §十三）。

## 十一、风险与已记录的后顾

- **`level`/`parentId` 不一致不归本切片**：Schema 不强制二者一致（领域文档已注明），写入路径服务端算 `level` 已保证新数据一致；存量数据如存在异常由主站/后台渲染容错，不额外加迁移修正。
- **`replyToCommentId` SetNull 的渲染侧**：被回复评论删除后，其余回复的 `replyToCommentId` 变 null；主站 `Item.vue` 需确认 `isReplyToChildComment` 对 null 不误判（§8.4 顺带修正）。管理端会话视图对 null 引用显示「回复了 <N>」或用空，不崩。
- **UserMessage 唯一约束对存量重复**：个人博客链条短，重复概率低；迁移含去重守卫兜底，临时库先验证。
- **邮件 best-effort 语义变化**：旧 `send-message.post` 邮件抛错会 500；新实现吞错仅记 `logger.warn`，通知契约由 `UserMessage`（事务内）保证。若后续要求邮件也可追溯，再加发送状态表（超出现有需求，不做）。
- **`http.delete` json body（已解决）**：ky DELETE 支持 `json`，Hono `parseBody` 读 `request.json()` 与方法无关——`DELETE /comments` 带 body 全链路已核验（§7.2）。不需要回退到 `POST /comments/batch-delete`。
- **日期区间时区**：`startDate`/`endDate` 按 ISO date 接受，API 侧以服务器本地时区当天 00:00/24:00 解析（与旧后台「按天筛选」语义一致）；前端传当地日期即可。
- **无自动化测试框架（设计定案）**：交互路径依赖 §九.5 人工矩阵与证据记录。

## 十二、本次讨论定案记录（2026-08-06）

- 上下文不 join 标题：path + 「在访客页打开」外链 + 同 path 会话树（避免改切片 2/4 写路径与回填）。
- 邮件迁入 API：移植 `mailer.ts`（Resend + 模板），siteName/siteUrl 改模块常量；根 `.env.example` 已预留 `HANA_MAIL_ENABLE`/`RESEND_API_KEY`/`RESEND_FROM`，补 API env schema 读取；邮件 best-effort 不阻断。
- 顺手加 Schema：`Comment.replyToCommentId → SetNull`、`UserMessage.commentId → Cascade`、`UserMessage @@unique([receiverId, commentId])`（顺带修复两个真实 P2003 隐患）。
- 通知生成归 API 评论服务；主站 `send-message.post` 删除、前端手搓消息块移除。

## 十三、实施证据附录（2026-08-06 完成）

### 静态门禁（§九.1）

`pnpm typecheck`、`pnpm lint`、`pnpm fmt:check`、`pnpm build`（全 workspace）全部 exit 0。

### 迁移（§九.2）

- 会话 `20260806120000_comment_moderation_fks` 已提交，SQL 为：`UserMessage` 去重守卫（注释内保留 `DELETE ... a.id > b.id` 备用，生产 `UserMessage` 0 行无需执行）→ `Comment_replyToCommentId_fkey` 改写为 `ON DELETE SET NULL ON UPDATE CASCADE` → `UserMessage_commentId_fkey` 改写为 `ON DELETE CASCADE ON UPDATE CASCADE` → `CREATE UNIQUE INDEX "UserMessage_receiverId_commentId_key"`。
- 一次性临时库 `slice5_tmp` 先 deploy 全部既有迁移再执行新迁移，校验：`confdeltype` 分别为 `n`（SET NULL）与 `c`（CASCADE）；去重守卫生效。随后在临时库构造「C(PARENT) → B(CHILD) → A(CHILD 指向 B 的 replyToCommentId)」：删 B 后 `A.replyToCommentId = NULL`（不再 P2003）；删被 `UserMessage` 引用的评论 → 消息级联清空；重复 `(receiverId, commentId)` 唯一约束拒绝。已删临时库，dev 库 `greyflowers_admin_test` `migrate deploy` 成功（该库 `UserMessage` 0 行，去重守卫无操作）。
- `pnpm prisma:generate`（Prisma 7.9.1）产出与 schema 一致。

### API 管理/公开/用户接口（§九.3/4）—— 自动化矩阵 42/42 PASS + SetNull 专项 PASS

覆盖：无 token 发评论 → 401；空内容（`'  '` trim 后）→ 400；>2048 → 400；`# 标题`/`![](url)`/`<div>`/`|表格|` → 400 且中文文案含对应「标题/图片/HTML/表格」；发 PARENT（contentMarkdown 生成、author 无 email）；admin 回复 PARENT 归一 `parentId=自身/replyToCommentId=目标`；admin 重复回复同评论 → UserMessage 仅 1 条（`skipDuplicates`）；user 回复 CHILD 归一；user 自回复 → 无消息；`public/comments/count|list` 与主站 DTO 逐字段一致（children asc）；`me/comments` 仅本人 + 无 token 401；`me/messages` 含被回复项且重复去重；`GET /comments` 树 + childrenCount + search/path contains 筛选 + `USER → 403`；管理 DTO 作者含 email/role；删他人评论 → 403；删自己无子 PARENT → `{deleted:1, cascade:0}`；再删同 id → 404；admin 删 PARENT → `{deleted:1+N, cascade:N}`；被删评论的 `UserMessage` 级联清理；批删混合存在+不存在 → 删存在并披露 / 全不存在 404 / ids 空 400 / >100 400 / USER 403；API 层「删兄弟回复指向的 B → A.replyToCommentId=NULL」专项 PASS。

### Admin 浏览器（§九.5，1440×900 与 375×780）

- 导航：桌面 rail「互动·评论」、移动 MoreSheet 含「评论」到位（底部 tab 保持 文章/动态/资产/更多）。
- 列表：共 N 条 MetaLine、搜索/path/作者 ID/日期筛选（防抖 300ms）、PARENT 树 + children + childrenCount 角标、ADMIN 角色 Pin、email、path 面包屑、「在访客页打开」外链（`https://caelum.moe + path`）。
- 会话视图：卡片「会话」→ `AppDialog size=lg`（桌面居中 / 移动底抽屉）展示 path + 外链 + 总条数 + PARENT + children（含 replyTo 引用行）+ 底部最小回复框；快捷回复成功 → toast「已回复，将通知 <username>」、会话刷新（5 条回复）、textarea 清空。
- 回复：dialog 引用块 + MD hint + 2048 上限；卡片入口回复成功 → toast「已回复，将通知 slice5-user」并关 dialog。
- 删除：`ConfirmDialog` 披露「将删除该评论及其 N 条回复（作者：…），不可恢复」；确认后 toast「已删除 3 条评论（含 2 条回复）」（deleted/cascade 来自返回值）。
- 批删：勾选 2 条 →「已选 2 条评论」操作栏（取消选择/删除所选）→ 披露「将删除所选的 2 条评论及其全部回复」→ toast「已删除 7 条评论」。
- 移动端 375px：筛选交移动「更多筛选条件」按钮 → `BottomSheet`（搜索/path/作者/日期/完成）；会话入口 → 底抽屉（`react-modal-sheet`，拖拽柄+背板，视觉模型确认无重叠、footer 回复框可点）；MoreSheet 含评论入口。

### 主站（§九.6/7）

- `api-gateway.ts` 新增 `apiMutate(method, path, { event, body })`：转发 `Authorization` Bearer，展开 `{success, data}` 信封，失败抛 `ApiGatewayError(status, code, message)`；读路径 `apiGet` 不动。
- 评论四端点薄适配：`/api/comments/list?path=` SSR 200 返回 `ParentCommentItem[]`（contentMarkdown、children、时间本地化 `YYYY-MM-DD hh:mm:ss`、author 无 email）；`/api/comments/count` 返回 `{totalCount, parentCount}`；`/api/comments/post` 透传写；`/api/comments/delete` 作者自删 200 `{deleted,cascade}`、再删 404、删他人 403。
- user 三端点：`/api/user/comments|messages` 认证自助读（带 Bearer 返回本人数据、无 token 401、`?id=` 参数被无视——旧漏洞关闭）；`/api/user/send-message` 删除（POST 命中 404 页，与任意不存在路由一致）。
- `blackList` 更新为 `['/api/comments/post', '/api/comments/delete', '/api/user/comments', '/api/user/messages']`。
- 浏览器（`/recently?id=7`）：评论区经 API 渲染 markdown（加粗生效）、本地化时间、回复/计数正常。
- `Item.vue` 渲染降级核对：`isReplyToChildComment = recordMode && replyToComment`（truthy 判定），`blockquoteContent` 仅在 `v-if` 分支内访问 —— `replyToComment: null` 时走 `isReplyToParentComment`（父引用）或整块不渲染，无空引用崩溃，无需补判空。
- 遗留清理 grep（`apps/main`，排除 `.nuxt`）：`commentSelectObj`/`childCommentArgs`/`parentCommentArgs`/`prismaShortcut`/`comment-serializer`/`comment-markdown`/`from '#server/utils/mailer'`/`prisma.comment`/`prisma.userMessage` 零残留；删除 `server/utils/{comment-markdown,comment-serializer,mailer,prismaShortcut}.ts` 与 `server/api/user/send-message.post.ts`。
- `#shared/types/comment.d.ts`、`comments.d.ts`、评论区渲染组件零改动（仅数据源经适配器）。

### 契约一个小修正（实现期按 §九 验收裁定）

`commentCreateInputSchema`/`commentReplyInputSchema` 的内容字段由 `.min(1).max(2048).trim()` 调整为 `.trim().min(1).max(2048)`：Zod 顺序上 transform 先于检查，原顺序会放行「纯空白内容」（验收矩阵实测 200），调整为 trim 后校验使「内容空 → 400」符合 §九.3「内容空 → 400」。属契约顺序修正，不是新增能力。
