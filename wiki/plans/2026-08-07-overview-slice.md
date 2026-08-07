# Grey Flowers 运营概览切片专项设计（切片 7）

## 状态与用途

- 决策日期：2026-08-07
- 状态：构思已与 Hana 讨论定案（决策记录见 §一、§十二），2026-08-07 定稿待实施；实施证据验收后追加（§十三）
- 文档类型：专项设计与实施任务边界（本切片实现的 SSOT）
- 读者：本切片的 contracts、API 概览模块、Admin 概览页与图表原语、音乐库过滤扩展的验收维护者
- 前置约束：
  - [admin-operational-workflow-slices.md](../design/admin-operational-workflow-slices.md) 的切片 7（运营概览）：**跨切片只读投影**；指标来自已迁移 API 用例，**不新增业务真相、写入规则或隐藏的跨资源事务**；本切片为该文档「评论、用户与概览各自承担不同任务」的落点
  - [2026-08-01-hono-backend-architecture.md](../design/2026-08-01-hono-backend-architecture.md) 的公开读/管理写两套 Interface、组合根依赖注入与路由薄原则
  - [2026-08-01-react-frontend-architecture.md](../design/2026-08-01-react-frontend-architecture.md) 的 feature 纵切与多端一致纪律
  - [API_CONVENTIONS.md](../../agent-docs/API_CONVENTIONS.md) 的信封、错误码、DTO 纪律（`zod strict`、不暴露 Prisma 类型、时间 ISO）
  - [apps/admin/DESIGN.md](../design/../../apps/admin/DESIGN.md) 与 [apps/admin/PRODUCT.md](../design/../../apps/admin/PRODUCT.md)：字盘/纸双材质、mono 承载度量、发丝分隔、100dvh 单滚动所有者、**反模式「The dashboard nobody asked for」**（本切片设计的首要张力）
  - [PACKAGES.md](../../agent-docs/PACKAGES.md) 的包边界：概览模块在 `apps/api` 内、DTO 在 `packages/contracts`、Admin 只读消费

本文授权：切片 7 涉及的 contracts 新增 `overview.ts` 并扩展 `music.ts` 列表查询、API 新增 `modules/overview/`（只读聚合，两个管理端点）、Admin 概览 feature（读数卡 + 趋势图 + 待处理 + 常用入口）与独立图表原语 `ui/charts.tsx`、音乐库 `incomplete` 精确筛选（改既有列表查询 + 列表页 chip + 路由 validateSearch）、首页路由 `/` 改挂概览并删除 `RedirectToArticles`。**不引入 schema 迁移**；**不新增业务真相与写入规则**；**不触碰** `apps/main`（概览仅管理端消费；`rss.xml`、`server/api/activity/*` 出界不动）。

本文基于对旧 `nuxt-admin`（/Users/nonhana/code_life/blog/nuxt-admin）仪表盘实现（`app/pages/index.vue`、`server/api/admin/dashboard/{stats,activities}.get.ts`、`types/index.ts` 的 `DashboardStats`）的行为盘点；不复制其 Nuxt API、Prisma 直连或页面内 DTO。

## 一、决策记录（本切片定案，2026-08-07 与 Hana 讨论锁定）

| 决策点 | 决定 | 理由 / 备注 |
| --- | --- | --- |
| 图表实现 | **自绘 SVG 原语** `apps/admin/src/ui/charts.tsx`（新增系统级原语，零依赖） | 仓库无图表库；只有自绘能贴合「字盘」体例（mono 刻度、tabular 数值、hairline 基线、petal 强调、无网格线堆），直接对冲 PRODUCT.md「nobody asked for dashboard」反模式；避免引入重依赖（recharts/nivo）及其通用观感 |
| 趋势图形态 | **单图**，「逐日新增」柱状图，同一张图内可切换**度量**（文章/评论/动态/用户）与**天数**（7/14/30，默认 14） | Hana 定案 「同一张图内可切换度量/天数」；不做多图、不做环形/热力等其它图表类型 |
| 概览不含最近动态 | **不做**首屏「最近活动」胶囊；旧 `activities.get.ts` 端点 → **拒绝**（§三） | Hana 定案 2.2；单人语料下「最近 10 条动态」是噪音，概览聚焦统计 + 待处理 + 入口 |
| 概览模块归属 | 新增 `apps/api/src/modules/overview/`，**只读聚合服务** `OverviewService(prisma)`，组合根注入；两个管理端点 `GET /overview` 与 `GET /overview/trends` | 投影只读、无写入、无事务、无跨资源写；路由薄、业务不进入 Admin；`/overview/trends` 单独端点使图表区可独立刷新 |
| 业务真相边界 | 计数/待处理/趋势**只**从既有字段投影：`published`、`level`、`status`、`mediaType`、`createdAt`、`publishedAt`、`wordCount`、`seconds`、`artist`/`album` 空串；**不**发明「待回复」「活跃度」等不存在状态 | 切片文档硬约束「不新增业务真相」；`UserMessage` 不设一级统计 |
| 读数卡集合 | 6 张，覆盖全部内容模型一族各一张：文章（已发布/草稿/已发布字数）、动态（总数/近 30 天）、评论（总数/父/子）、用户（总数/近 30 天）、资产（可用总数/图片/音频/待清理）、音乐（曲目/缺元数据/总时长）；**不含** tags/categories 计数 | 旧仪表盘统计 articles/comments/tags/categories；tags/categories **拒绝**（§三，低信息量、已有专用页）；6 卡恰配 `xl:grid-cols-6` 一行；趋势另有「逐日新增」视角 |
| 待处理集合 | 3 项，均真实可深链：草稿文章（`/articles?status=draft`）、待清理资产（`/assets?status=PENDING_CLEANUP`）、缺元数据音乐（`/music?incomplete=true`，本切片新增过滤）；全零 → 安静「无待办」空态 | 只列已交付工作流的真实状态；Hana 定案 2.3（精确筛选）与 2.4（要空态） |
| 音乐缺元数据过滤 | 复用 `musicListQuerySchema` 增 `incomplete`（`z.enum(['true']).optional()`），定义 **`artist='' OR album=''`**；admin `list` 应用，`listPublic` 忽略 | `artist`/`album` 在 create 输入可选、DTO 允许空串，空串 = 真实存在的「待补元数据」状态；仅 admin 列表页 + 概览深链使用，公开读语义不变 |
| 深链可回溯性 | 音乐列表页新增「缺元数据」`FilterChip` + 路由 `validateSearch`，URL 进入可复位；沿用文章 `status` 的「深链 + 可见 chip」模式 | 概览深链不是藏在 URL 里的魔法参数；运营可从 chip 复位 |
| 趋势序列口径 | articles 按 `publishedAt`、comments 按 `publishedAt`、activities 按 `publishedAt`、users 按 `createdAt`；返回全窗口逐日（含零值） | 语义 = 「逐日新增」；见 §十一 已知妥协（文章无 `createdAt`，`publishedAt` 即入库/发布时刻） |
| 时区口径 | 按 **API 服务器本地时区**逐日（本地午夜为界，JS 本地日键桶化填零） | 与评论列表 `startDate` 的既有语义一致（`new Date('YYYY-MM-DDT00:00:00')` 本地解析）；不加时区配置 |
| 大数/BigInt | 概览 DTO 全部 `z.number().int().min(0)`；资产**不**展示合计字节（`byteSize` 是 BigInt，避免序列化取舍）、音乐展示 `secondsTotal` 整数求和 | 单人语料下字节合计无信息量；音乐时长以秒整数进 DTO，展示层转 `mm:ss` |
| 错误码 | **不新增**：非法 metric/days → `VALIDATION_FAILED`；非管理员 → `AUTH_FORBIDDEN` | 切片 5/6「无新增错误码」纪律一致 |
| 导航与落地页 | `/` = 概览页（替换 `RedirectToArticles`）；rail 顶部新增独立「总览」小节（`LayoutDashboard`）；移动端纳入 `MoreSheet`，底部 tab 三目标不变 | Hana 期望首页即概览；单滚动所有者随 PageBody `scroll="child"` 落实 |
| 明确不做 | 最近活动流、发布日历热力、多图、其它图表类型、概览任意写入/导出/邮件、`apps/main` 改动、schema 迁移、自动化测试框架 | 与切片边界清晰；不超主站运营需求 |

## 二、运营结果与完成边界

管理员完成结果：**打开后台即见全站态势——关键计数、近 N 天新增趋势、待处理事项与常用入口，以最短路径进入已交付的运营工作流。**

完成边界（闭环）：

1. **统计读数**：6 张读数卡覆盖文章/动态/评论/用户/资产/音乐的核心计数，数字 mono tabular 对齐，来自 API 只读投影。
2. **趋势图表**：一张「逐日新增」柱状图，度量与天数图内切换，全窗口含零值，空数据态与失败重试齐备。
3. **待处理状态**：只列真实可处置状态（草稿/待清理/缺元数据），每项可深链进入对应已交付工作流；全零显示「无待办」。
4. **常用入口**：页头常用入口（新建文章/发布动态/上传资产/上传音乐），遵循 One Solid Rule 的按钮层。
5. **权限边界**：`/overview` 与 `/overview/trends` 全部 `requireRole('ADMIN')`（非管理员 `AUTH_FORBIDDEN`）。
6. **纯投影**：无 schema 迁移、无写入、无隐藏跨资源事务；目标：**不新增业务真相**。
7. **音乐精确筛选**：`GET /music?incomplete=true` 返回缺元数据曲目；列表页 chip 可见可复位；公开读不受影响。

## 三、行为清单（旧 nuxt-admin 仪表盘与主站的采纳/调整/拒绝）

| 旧行为 / 主站行为 | 处置 | 结论 |
| --- | --- | --- |
| 首页 `index.vue`：`/api/admin/dashboard/stats` 计数卡 + 快捷操作 + `/activities` 最近活动列表 | 采纳（调整）/ 拒绝 | 计数卡与快捷操作语义照迁（概览页）；最近活动 **拒绝**（Hana 定案 2.2，单人语料噪音）；整体从 Nuxt `useFetch` 迁入 React feature + 统一信封 |
| 统计 `stats.get.ts`：articles/comments/**tags/categories** 四计数（Prisma 直连） | 采纳（调整）+ 拒绝 | articles/comments 计数采纳并扩充（已发布/草稿、父/子）；**tags/categories 拒绝**（低信息量、已有专业页面，概览聚焦产出与待办）；新增资产/音乐/用户与待处理投影 |
| 最近活动 `activities.get.ts`：取最近 articles/comments/activities/music 各 3 条合并 10 条，相对时间 | **拒绝** | 概览不含最近动态胶囊（Hana 定案 2.2）；`Music` 无时间字段致旧实现 `createdAt: '刚刚'` 属硬编码噪音，一并拒绝 |
| 快捷操作区块 | 采纳（调整） | 概览页头「常用入口」actions，One Solid Rule 下唯一 solid = 新建文章 |
| 图表 / 趋势 / 待处理 / 精确筛选 | 新增 | 旧后台无；按 §一 决策新增，自绘柱图 + 待处理深链 |

## 四、数据模型与数据库迁移

### 结论：无 schema 变更、无迁移

概览是既有字段的只读投影；音乐 `incomplete` 过滤只加查询参数，不加列。**不新增任何迁移。**

### 指标 → 字段映射（全部既有，服务端只读）

| 指标 | 来源字段 / 语义 |
| --- | --- |
| 文章 已发布 / 草稿 | `Article.published = true / false` 计数（与 `/public/articles/count` 的 published 语义一致） |
| 文章 已发布字数 | `aggregate _sum.wordCount` where `published = true` |
| 动态 总数 / 近 30 天 | `Activity` 计数；`publishedAt >= 本地 now-30d 零点`（创建即发布语义，字段即 `publishedAt`） |
| 评论 总数 / 父 / 子 | `Comment` 计数 + `groupBy level`（`PARENT`/`CHILD`） |
| 用户 总数 / 近 30 天 | `User` 计数；`createdAt >= 本地 now-30d 零点` |
| 资产 可用总数 / 图片 / 音频 / 待清理 | 计数 where `status != 'DELETED'` + `groupBy [status, mediaType]`；`PENDING_CLEANUP` 计数 |
| 音乐 曲目 / 缺元数据 / 总时长 | `Music` 计数；`artist='' OR album=''` 计数；`aggregate _sum.seconds` |
| 待处理 draft_articles | 同「文章草稿」计数 |
| 待处理 pending_cleanup_assets | 同「资产待清理」计数 |
| 待处理 incomplete_music | 同「音乐缺元数据」计数 |
| 趋势 逐日新增 | 见下表，服务端本地日桶化填零 |

| metric | model | 时间字段 |
| --- | --- | --- |
| `articles` | Article | `publishedAt` |
| `comments` | Comment | `publishedAt` |
| `activities` | Activity | `publishedAt` |
| `users` | User | `createdAt` |

## 五、Contracts 变更（`packages/contracts/src/`）

### 5.1 新增 `overview.ts`，并在 `index.ts` 再导出

```ts
// ============ 概览（只读投影，管理端） ============

// —— 读数卡计数 ——
export const overviewCountsSchema = z.object({
  articles: z.object({
    published: z.number().int().min(0),   // published = true
    drafts: z.number().int().min(0),      // published = false
    wordTotal: z.number().int().min(0),   // _sum.wordCount, published = true
  }).strict(),
  activities: z.object({
    total: z.number().int().min(0),
    last30d: z.number().int().min(0),     // publishedAt >= now-30d
  }).strict(),
  comments: z.object({
    total: z.number().int().min(0),
    parents: z.number().int().min(0),     // level = PARENT
    children: z.number().int().min(0),    // level = CHILD
  }).strict(),
  users: z.object({
    total: z.number().int().min(0),
    joined30d: z.number().int().min(0),   // createdAt >= now-30d
  }).strict(),
  assets: z.object({
    total: z.number().int().min(0),       // status != 'DELETED'
    images: z.number().int().min(0),
    audio: z.number().int().min(0),
    pendingCleanup: z.number().int().min(0), // status = PENDING_CLEANUP
  }).strict(),
  music: z.object({
    total: z.number().int().min(0),
    missingMetadata: z.number().int().min(0), // artist='' OR album=''
    secondsTotal: z.number().int().min(0),    // _sum.seconds
  }).strict(),
}).strict();
export type OverviewCounts = z.infer<typeof overviewCountsSchema>;

// —— 待处理条目：key 是契约，label/深链映射在 Admin 展示层 ——
export const overviewPendingKeySchema = z.enum([
  'draft_articles',
  'pending_cleanup_assets',
  'incomplete_music',
]);
export type OverviewPendingKey = z.infer<typeof overviewPendingKeySchema>;

export const overviewPendingItemSchema = z.object({
  key: overviewPendingKeySchema,
  count: z.number().int().min(0),
}).strict();
export type OverviewPendingItem = z.infer<typeof overviewPendingItemSchema>;

export const overviewDataSchema = z.object({
  counts: overviewCountsSchema,
  pending: z.array(overviewPendingItemSchema).strict(),
}).strict();
export type OverviewData = z.infer<typeof overviewDataSchema>;
export const overviewResponseSchema = apiSuccessSchema(overviewDataSchema);
export type OverviewResponse = z.infer<typeof overviewResponseSchema>;

// —— 趋势查询：metric/days 是查询串，经 z.enum 严格校验 ——
export const overviewTrendMetricSchema = z.enum([
  'articles',
  'comments',
  'activities',
  'users',
]);
export type OverviewTrendMetric = z.infer<typeof overviewTrendMetricSchema>;

export const overviewTrendQuerySchema = z.object({
  metric: overviewTrendMetricSchema.default('articles'),
  days: z.enum(['7', '14', '30']).default('14'),
}).strict();
export type OverviewTrendQuery = z.infer<typeof overviewTrendQuerySchema>;

// 逐日点：date 为服务端本地日 'YYYY-MM-DD'；含零值，前端直绘。
export const overviewTrendPointSchema = z.object({
  date: z.string(),
  count: z.number().int().min(0),
}).strict();
export type OverviewTrendPoint = z.infer<typeof overviewTrendPointSchema>;

export const overviewTrendDataSchema = z.object({
  metric: overviewTrendMetricSchema,
  days: z.enum(['7', '14', '30']),
  /** 窗口内每一天一个点，未命中填 0；长度恒等于 days */
  points: z.array(overviewTrendPointSchema).strict(),
  /** 窗口内合计（调试/角标用） */
  total: z.number().int().min(0),
}).strict();
export type OverviewTrendData = z.infer<typeof overviewTrendDataSchema>;
export const overviewTrendResponseSchema =
  apiSuccessSchema(overviewTrendDataSchema);
export type OverviewTrendResponse = z.infer<typeof overviewTrendResponseSchema>;
```

- 全部 `.strict()`；不暴露 Prisma 类型；时间用 ISO / 本地日 `YYYY-MM-DD` 字符串（展示层本地化由 Admin 承担）。
- 度量/天数枚举与响应 `metric`/`days` 复用同一枚举，避免两套规则。

### 5.2 `music.ts`：列表查询追加 `incomplete`

```ts
export const musicListQuerySchema = z.object({
  /** 匹配 title/artist/album，不区分大小写。 */
  search: z.string().max(100).optional(),
  /** 管理端：仅返回 artist='' OR album='' 的曲目（缺元数据）；公开读忽略。 */
  incomplete: z.enum(['true']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
}).strict();
```

`musicListQuerySchema` 为 admin `/music` 与 `/public/music` 共用：admin `list` 应用 `incomplete`，`listPublic` 不应用（§六.4）。

## 六、apps/api 变更

### 6.1 `modules/overview/`（routes.ts / service.ts / contracts.ts）

- `routes.ts` 保持薄：验证查询 → 调 service → `createSuccess`；整组 `adminGuard`（`principal + admin`），其余端点不受影响。
- `service.ts`：`OverviewService` 仅注入 `prisma`；统计与趋势均为**只读并行查询**（`Promise.all`），**不开事务**、无写入。
- `contracts.ts`：服务端按 §四 表格构造 `OverviewData` / `OverviewTrendData` 对象（口径集中一处，注释标明来源字段），不返回 Prisma 实例。

### 6.2 路由表

| 端点 | 认证 | 输入 | 成功 `data` | 特殊规则 |
| --- | --- | --- | --- | --- |
| `GET /overview` | ADMIN | 无 | `overviewDataSchema` | 6 组读数 + 3 项待处理；并行计数/聚合 |
| `GET /overview/trends` | ADMIN | `overviewTrendQuerySchema` | `overviewTrendDataSchema` | metric/days 严格校验；非法 → `VALIDATION_FAILED` |

挂载（`apps/api/src/app.ts`）：

```ts
app.route('/overview', createOverviewRoutes(dependencies));
```

`bootstrap/dependencies.ts`：`AppDependencies` 增 `overview: OverviewService`，`createDependencies` 注入 `overview: new OverviewService(prisma)`。

### 6.3 trends 服务要点（投影，无事务）

```ts
const METRIC_FIELD: Record<OverviewTrendMetric, 'publishedAt' | 'createdAt'> = {
  articles: 'publishedAt',
  comments: 'publishedAt',
  activities: 'publishedAt',
  users: 'createdAt',
};

async getTrends(metric, days) {
  // 本地日窗口：[today-(days-1) 00:00, tomorrow 00:00)
  const start = new Date(nowLocal.getFullYear(), nowLocal.getMonth(),
    nowLocal.getDate() - (days - 1));
  const end = new Date(nowLocal.getFullYear(), nowLocal.getMonth(),
    nowLocal.getDate() + 1);
  const rows = await this.prisma[model].findMany({
    select: { [field]: true },
    where: { [field]: { gte: start, lt: end } },
  });
  // JS 本地日键（getFullYear/getMonth/getDate）桶化填零，
  // 与评论 startDate 的本地语义一致；不引 raw SQL（单人语料规模）。
  return { metric, days, points: [...days 个点, 含 0], total };
}
```

- `update` 之类业务零；`where` 无业务规则，纯时间窗聚合。
- 语料小（单人），`findMany` 拉时间戳 + JS 桶化是明确选择，不建缓存/不引 raw SQL（风险见 §十一）。

### 6.4 music 过滤扩展

- `service.ts`：`buildListWhere(search?: string, incomplete?: boolean)` —— `incomplete` 为真时在既有 `search` 条件外**并列 AND** `{ OR: [{ artist: '' }, { album: '' }] }`；`list()` 把 `input.incomplete !== undefined` 传入，`listPublic()` 不传（公开忽略该参数）。
- `routes.ts`：无需改动（`parseQuery(musicListQuerySchema)` 已含新参数）。

### 6.5 错误码

仅复用现有：`VALIDATION_FAILED`（400：trends 非法 metric/days）、`AUTH_FORBIDDEN`（403：非管理）、`AUTH_REQUIRED`（401）。无新增错误码。

## 七、apps/admin 变更

### 7.1 首页路由与导航

- `routes/route-tree.tsx`：
  - `indexRoute` 改为 lazy 加载 `features/overview/overview-page.js`（`OverviewPage`）；删除 `RedirectToArticles` 组件与引用。
  - `musicListRoute` 增加 `validateSearch`：`incomplete` 存在 → `{ incomplete: 'true' }`，否则 `{}`（对齐文章 `status` 的规范化深链模式）。
- `app/shell/console-shell.tsx`：
  - `SECTIONS` 顶部新增小节 `{ title: '概览', items: [{ icon: LayoutDashboard, label: '总览', path: '/' }] }`（置于「内容」之前）。
  - 移动端 `MoreSheet` 加入「总览」；底部 3 目标 tab（文章/资产/更多）保持不变。

### 7.2 图表原语 `ui/charts.tsx`（唯一新增 UI 原语文件）

- 导出 `TrendBars`：极简 SVG 柱图原语——mono 刻度日期、hairline 基线、petal-accent 柱（唯一强调色）、tabular 数值（`font-variant-numeric: tabular-nums`）、无网格线堆叠。
- 无障碍：`role="img"` + `aria-label`（「近 N 天 文章 逐日新增，共 total」），柱高 ≤ 值的比例可读。
- 动效：`140–240ms` 淡入（柱顶位移可选，严格 in 带），`prefers-reduced-motion: reduce` 全局坍缩为 `0.01ms`；不缩放、不跳跃。
- 理由（DESIGN.md「Nothing outside it should be invented without a reason」）：概览图表是系统级原语，跨工作流可复用；本切片为其第一个消费者。

### 7.3 `app/api/overview.ts` + `ApiClient`

```ts
export const createOverviewApi = (http: Http) => ({
  get: (): Promise<OverviewData> =>
    http.get('/overview', { authenticated: true, schema: overviewResponseSchema }),
  trends: (query: OverviewTrendQuery): Promise<OverviewTrendData> =>
    http.get('/overview/trends', {
      authenticated: true,
      schema: overviewTrendResponseSchema,
      searchParams: trendSearchParams(query),
    }),
});
```

`ApiClient` 增 `readonly overview`（`apps/admin/src/app/api/index.ts`）。

### 7.4 `features/overview/`

- `overview-page.tsx` —— `PageBody scroll="child"`（概览区自身为唯一滚动所有者，维持「页面无滚动条」契约，宽 `wide`）：
  - `PageHeader` 标题「运营概览」+ 常用入口 actions：新建文章（`solid`，One Solid Rule 唯一 solid）、发布动态 / 上传资产 / 上传音乐（`quiet`）。
  - **读数卡网格**：`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6`；每卡 `Panel`（case-raised + hairline，不叠阴影）：mono `SectionLabel` 微标签 + tabular 主数字 + mono 副行（如 `草稿 N · 字数 M`、`父 N · 子 M`）。6 卡 = 文章 / 动态 / 评论 / 用户 / 资产 / 音乐，一行六卡（`xl`），平板两行三卡、手机单列。
  - **趋势卡**：`Panel` 内含 `FilterChip` 组（度量：文章/评论/动态/用户）+ 天数 `FilterChip` 组（7/14/30）+ `TrendBars`；加载 `Skeleton`、空数据态（全零仍绘基线 + 「近 N 天无新增」）、失败重试（沿用 `requestKey` + `cancelled` 模式）。
  - **待处理卡**：`Panel` + `RowStack`，每行 = 图标 + mono 标签 + 计数 + 深链（chevron）：草稿文章 → `/articles?status=draft`、待清理资产 → `/assets?status=PENDING_CLEANUP`、缺元数据音乐 → `/music?incomplete=true`；**全零 → 安静「无待办」空态**（EmptyState 体例，无 medallion 噪音）。
  - 失败/加载：计数与趋势错误分别处理，互不阻塞（`/overview` 与 `/overview/trends` 两次请求独立）。
- 小组件（`readout-card.tsx`、`trend-card.tsx`、`pending-panel.tsx`）为 feature 内局部组件，不预置到 `ui/`（除 `TrendBars` 外无全局复用需求）。

### 7.5 音乐列表 `incomplete` 筛选

- `app/api/music.ts`：`listSearchParams` 增 `query.incomplete === 'true'` 时 `params.set('incomplete', 'true')`。
- `features/music/list-page.tsx`：搜索框旁新增 `FilterChip`「缺元数据」，状态由 `useSearch` 初始化并从 URL 同步（`validateSearch` 已规范化）；chip 选中 → 请求带 `incomplete=true`，取消 → 去掉参数。

### 7.6 设计语言校验

全部复用 `@/ui/index.js` 原语（`PageBody/PageHeader/Panel/SectionLabel/RowStack/MetaLine/EmptyState/Skeleton/FilterChip/Button` 等）+ 新 `TrendBars`；数字 mono tabular、唯一 accent、发丝分隔、无装饰动画、单滚动所有者；不新造主题变量；`lucide-react` 图标。

## 八、apps/main 迁移

本切片为 **Admin 专属**，`apps/main` **零改动**：

1. 概览端点全部 `requireRole('ADMIN')`，主站 `apiGet`/`apiMutate` 不透出。
2. `rss.xml`（`prisma.article`）与 `server/api/activity/*` 属其它切片边界，本切片不触碰。
3. 主站将 `/` 默认落地行为留作现有页面（本切片只改 Admin 侧 `/`）。

## 九、验收与证据（按切片文档 §每个切片的交付闭环）

人工验收矩阵至少覆盖：

1. **静态门禁**：`pnpm typecheck`、`pnpm lint`、`pnpm fmt:check`、`pnpm build`（全 workspace）绿。
2. **API 概览（本地 dev）**：
   - `GET /overview`：六组读数与测试库数值一致（文章 published/drafts/wordTotal、动态 total/last30d、评论 total/parents/children、用户 total/joined30d、资产 total/images/audio/pendingCleanup、音乐 total/missingMetadata/secondsTotal）；`pending` 三项 key/count 正确；空库时全 0、`pending` 仍三项稳定结构；非管理 token → `403 AUTH_FORBIDDEN`。
   - `GET /overview/trends`：`metric`/`days` 默认与切换正确；非枚举（`metric=foo`、`days=10`）→ `400 VALIDATION_FAILED`；窗口长度恒等于 days；含零值逐日点、`total` 与手工数一致；`days=7` 与 `days=30` 边界点正确。
   - `GET /music?incomplete=true`：只返回 `artist='' OR album=''` 曲目；与 `search` 组合过滤正确；`/public/music?incomplete=true` 忽略该参数（与不带参数一致）；管理 DTO 无新增多余字段。
3. **Admin 浏览器（1440×900 与 375×780）**：
   - 导航：桌面 rail 顶部「总览」小节（active 态 `data-status`）、移动 MoreSheet 含「总览」；`/` 直接落地概览，不再跳 `/articles`。
   - 读数卡：6 卡数值与 API 一致、字数/时长格式化（`formatDuration`）正确、数字 tabular 对齐；加载 Skeleton → 内容、失败重试可用。
   - 趋势：度量切换（文章/评论/动态/用户）与天数切换（7/14/30）重取数且图重绘；空数据态（全零基线 + 「近 N 天无新增」）；`prefers-reduced-motion` 下无动画。
   - 待处理：三项深链分别落到 `/articles?status=draft`、`/assets?status=PENDING_CLEANUP`、`/music?incomplete=true`，且目标页 chip/筛选位可回溯复位；全零显示「无待办」空态。
   - 常用入口：页头四动作可达对应新建/上传页，One Solid Rule（仅「新建文章」solid）。
   - 音乐列表：新增「缺元数据」chip 选中/取消正确，URL 与 chip 双向同步。
   - 移动 375px：概览读数卡单列、趋势卡全宽、待处理行可点；全流程可走通。
4. **主站**：确认零改动（§八 三项）。

## 十、实施任务拆分（按序，均待授权）

0. **阶段 0 验证**：复核 §四 字段映射及 `buildListWhere` 扩展点（music）、`parseQuery` 对未知 key 的严格性（`zod strict` 下新参数必须进 schema，否则深链被 400）；确认 `TrendBars` 落在既有 CSS 变量体系内（无新 token）。
1. contracts：`overview.ts` + `music.ts` 的 `incomplete` + `index.ts` 再导出。
2. api：`modules/overview/`（routes/service/contracts）+ `dependencies.ts` 注入 + `app.ts` 挂载 `/overview`；music `buildListWhere` + `list` 传参。
3. admin：`ui/charts.tsx`（TrendBars 原语）；`app/api/overview.ts` + `ApiClient.overview`；`features/overview/`（page/readout/trend/pending 组件）；route-tree `/` + `musicListRoute.validateSearch` + shell 导航「总览」；music `listSearchParams` + 列表页「缺元数据」chip。
4. 验收：§九 全矩阵人工验收 + 证据附录（追加到本文 §十三）。

## 十一、风险与已记录的后顾

- **趋势「文章」口径 = `publishedAt` 而非创建时间**：`Article` 无 `createdAt`，草稿入库时 `publishedAt` 即 `now()`、首发时被重写为发布时刻（API 既有语义）。故「逐日新增文章」=「入库/发布」混合口径，存在「30 天前写的草稿昨日发布 → 计入昨日」的平移，已接受并记录；不另加列（无迁移）。验收时以该口径核对趋势图。
- **时区依赖服务器本地日**：换部署时区会平移趋势日界与 joined30d 边界；与评论 `startDate` 既有语义一致，低风险；文档记录（若未来多时区部署需在 `env.ts` 引入 TZ 并设计校准，超出本切片）。
- **PRODUCT.md 反模式张力**：「nobody asked for dashboard」——本切片以 register 对冲：mono 数字、发丝分层、无装饰动画、1 solid、待办可深链；验收以「像字盘不像 BI」为准，若观感偏离立即回退读法设计而非加装饰。
- **BigInt 不出 DTO**：资产字节忽略；音乐时长以第整数秒求和，避免 BigInt 序列化取舍；未来若需字节统计再设计 `string`/`number` 契约。
- **`incomplete` 与既有 8 模块无关**：只动 music 的 `list`/`buildListWhere`；公开读忽略不破坏主站。若 `artist`/`album` 未来改 nullable 语义，过滤与 create 校验需同步（记录）。
- **无缓存**：概览每次整页刷新各跑一组并行只读查询；单人语料规模（千级内）无性能问题；不做 Redis/内存缓存（不带来折旧复杂度）。
- **无自动化测试框架（设计定案）**：交互路径依赖 §九.3 人工矩阵与证据记录。

## 十二、本次讨论定案记录（2026-08-07）

- 图表实现自绘 SVG 原语（`ui/charts.tsx`，零依赖），不对接库；趋势**单图**、图内切换度量（文章/评论/动态/用户）与天数（7/14/30，默认 14）。
- 概览首屏**不做**最近动态胶囊（拒绝旧 `activities.get.ts`）；旧 `dashboard/stats` 的 tags/categories 计数也拒绝（低信息量）。
- 音乐缺元数据**精确筛选**：扩展已交付的 `GET /music` 列表查询（`incomplete`，`artist='' OR album=''`）+ 列表页可见 `FilterChip` + 路由 `validateSearch`，概览深链 `/music?incomplete=true` 可回溯复位。
- 待处理全零显示**安静「无待办」空态**。
- API：`modules/overview/` 只读投影服务，`GET /overview` + `GET /overview/trends`，`adminGuard`，无 schema 迁移、无写入、无新增错误码；`apps/main` 零改动。
- Admin：`/` 落地概览、rail 顶部「总览」小节、移动 MoreSheet 入口；单滚动所有者契约照旧。

## 十三、实施证据附录（待实施并验收后追加）

**状态**：2026-08-07 实施完成，全矩阵人工验收通过。

### 静态门禁（全 workspace，从仓库根执行）

- `pnpm typecheck` ✅
- `pnpm lint` ✅（exit 0，无 error/warning）
- `pnpm fmt:check` ✅
- `pnpm build` ✅（contracts → db → api → admin → main 全绿，`✨ Build complete!`）

### 变更清单

- `packages/contracts/src/overview.ts`（新增）+ `index.ts` 再导出；`music.ts` 的 `musicListQuerySchema` 追加 `incomplete: z.enum(['true']).optional()`。
  - 计划 §五.1 原稿的 `z.array(...).strict()` 是 invalid（ZodArray 无 `.strict()`），落地为 `z.array(...)`（元素 schema 各自 `.strict()`），其余逐一照搬。
- `apps/api/src/modules/overview/`（`routes.ts` / `service.ts` / `contracts.ts`，只读投影、`adminGuard` 整组）；`bootstrap/dependencies.ts` 注入 `overview: new OverviewService(prisma)`；`app.ts` 挂载 `app.route('/overview', ...)`。
- `apps/api/src/modules/music/service.ts`：`buildListWhere(search, incomplete)` 扩展 + `list` 传参、`listPublic` 忽略；`apps/admin/src/app/api/music.ts` `listSearchParams` 透传 `incomplete`。
- `apps/admin/src/ui/charts.tsx`（新增 `TrendBars` 自绘 SVG 原语）+ `ui/index.ts` 导出。
- `apps/admin/src/app/api/overview.ts`（新增，具名 `OverviewApi` 接口）+ `ApiClient.overview`。
- `apps/admin/src/features/overview/`（`overview-page.tsx` / `readout-card.tsx` / `trend-card.tsx` / `pending-panel.tsx`）。
- `apps/admin/src/routes/route-tree.tsx`：`/` 挂 `OverviewPage`、删除 `RedirectToArticles`；`assetsListRoute` 新加 `validateSearch`（待清理深链可复位）；`musicListRoute` 新加 `validateSearch`（`incomplete` 归一为布尔 `true`）。
- `apps/admin/src/app/shell/console-shell.tsx`：rail 顶部「概览 / 总览」小节 + 移动 `MoreSheet`「总览」。
- `apps/admin/src/features/assets/list-page.tsx` + `display.ts`：资产状态筛选改为 URL 驱动（`parseAssetStatusFilter`），使 `/assets?status=PENDING_CLEANUP` 深链落地即筛、可复位。
- `apps/admin/src/features/music/list-page.tsx`：新增「缺元数据」`FilterChip`，URL 与 chip 双向同步（读取 `useSearch`，切换 navigate）。

### 关键实现说明（对 §/计划的偏离与理由）

1. **TanStack search 序列化关键坑（落地修正）**：默认 `parseSearch` 用 `JSON.parse`，故 `?incomplete=true` 直入时值是布尔 `true` 而非字符串 `'true'`；若按计划 §七.1 原稿校验 `search.incomplete === 'true'` 会判定未命中，点击 chip 反会把字符串 `'true'` 双重编码成 `?incomplete=%22true%22`。落地：`validateSearch` 统一 `search.incomplete === true || search.incomplete === 'true' ? { incomplete: true } : {}`（布尔 round-trip 稳定），页面/chip/待处理深链均用布尔 `true`；API 请求参数仍由 `listSearchParams` 按 `'true'` 字符串发送（与 schema 一致）。
2. **资产页 URL 化是计划的隐性前提**：计划 §九.3 验收要求 `/assets?status=PENDING_CLEANUP` 深链「可回溯复位」，但 §七 任务拆分只给了 music `validateSearch`。资产页原本纯本地筛选态，深链会落在「全部」上、读不出待清理视图 → 视为验收硬约束，落地 URL 驱动（与文章 `status` 模式对齐：侧栏/筛选同步、`清除` 复位 URL）。
3. **`TrendBars` 几何**：viewBox `0 0 (days*100) 128`，柱 `y = BAR_MAX(100) - height`（基线上方生长），hairline 基线 `stroke-rule` 1px；mono 刻度只用稀疏样本（≤8 全出，更长取 ~6 个）；动效复用既有 `gf-fade-in`（180ms ease-out），全局 `prefers-reduced-motion` 坍缩为 `0.01ms`，不新造主题变量。

### API 人工验收（本地 dev：admin token = nonhana@outlook.com / 20021209xiang）

| 检查 | 结果 |
| --- | --- |
| `GET /overview` 未登录 | `401 AUTH_REQUIRED` ✅ |
| `GET /overview`（admin） | 六组读数与直查 DB 完全一致：articles 640/160/972480、activities 180/0、comments 2100/1400/700、users 320/0、assets 1471/1191/280/11、music 260/0/57070；`pending` 三项结构稳定 ✅ |
| `GET /overview/trends` 各 metric/days | window 长度恒等于 days；`metric=articles&days=7` 返回 7 点全 0（测试库近 30 天无新数据，符合预期）；`days=30` 起 30 天边界点 `2026-07-09…2026-08-07` ✅ |
| trends 校验 | `metric=foo` → `400 VALIDATION_FAILED fields.metric`；`days=10` → `400`；默认 `metric=articles days=14` ✅ |
| 权限 | 普通用户 `/overview` 与 `/overview/trends` → `403 AUTH_FORBIDDEN` ✅ |
| `GET /music?incomplete=true` | 只返回 `artist='' OR album=''`（临时插入 2 条验证后清理）；与 `search` 组合 AND ✅ |
| `GET /public/music?incomplete=true` | 忽略参数，返回全部 ✅ |

### Admin 浏览器人工验收（1440×900 与 375×780）

- `/` 直接落地概览（不再跳 `/articles`）；rail 顶部「概览 / 总览」小节，`data-status="active"` 正确 ✅；移动 `MoreSheet` 含「总览」✅。
- 读数卡 6 张单行（`xl:grid-cols-6`），数字与 API 一致、mono tabular、副行（草稿·字数 / 父·子 / 总时长 `mmm:ss`）✅；加载 Skeleton → 内容 ✅。
- 趋势卡：度量（文章/评论/动态/用户）与天数（7/14/30）chip 图内切换重取数；SVG 柱状图柱高比例、hairline 基线、稀疏 mono 刻度 ✅；空数据态（全 0 仍绘基线 + 「近 N 天无新增」）✅。
- 待处理：草稿文章 → `/articles?status=draft`（列表共 160 篇全草稿）、待清理资产 → `/assets?status=PENDING_CLEANUP`（全部待清理 + select 显示「状态 · 待清理」可清除复位）、缺元数据音乐 → `/music?incomplete=true`（URL 单次编码 + chip 选中 + 仅缺元数据曲目）✅。
- 常用入口：页头四动作（新建文章 solid 唯一、发布动态/上传资产/上传音乐 quiet）✅。
- 音乐列表「缺元数据」chip：点击 → `/music?incomplete=true` 且请求带参、取消 → URL 回 `/music` 与 chip 同步 ✅。
- 移动 375px：读数卡单列、底部拇指栏（文章/资产/更多）、页面单滚动所有者、趋势卡与待处理行可读可点 ✅。
- DB 清净：所有临时验证数据（音乐/动态/用户）均已清理，`music total 260 missing 0`、`activity total 180` = 种子原值 ✅。

