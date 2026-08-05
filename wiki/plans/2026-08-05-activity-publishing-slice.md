# Grey Flowers 动态发布切片专项设计（切片 4）

## 状态与用途

- 决策日期：2026-08-05
- 状态：构思已与 Hana 讨论定案（决策表见 §一），待 Hana 审阅本文后实施
- 文档类型：专项设计与实施任务边界（本切片实现的 SSOT）
- 读者：本切片的 contracts、API、Admin 动态工作台、主站迁移与验收维护者
- 前置约束：
  - [admin-operational-workflow-slices.md](../design/admin-operational-workflow-slices.md) 的切片 4（动态发布）与本切片 §「音乐库与动态发布分开交付」
  - [2026-08-04-music-library-slice.md](./2026-08-04-music-library-slice.md)（切片 3，已完成验收）的 `Music`/`Track` 契约、公开读、`activityId` 只读预留与 §十二 交接
  - [2026-08-01-hono-backend-architecture.md](../design/2026-08-01-hono-backend-architecture.md) 的公开读/管理写两套 Interface
  - [2026-08-01-react-frontend-architecture.md](../design/2026-08-01-react-frontend-architecture.md) 的 feature 纵切与「不建第二套上传规则」纪律
  - [2026-08-02-managed-assets-slice.md](./2026-08-02-managed-assets-slice.md)（切片 1，已完成验收）的 Asset 用例与 `ACTIVITY_IMAGE` 用途
  - [2026-08-03-content-publishing-slice.md](./2026-08-03-content-publishing-slice.md)（切片 2，已完成验收）的主站薄适配（`api-gateway.ts`）范式
  - [2026-08-02-grey-flowers-authentication-system.md](./2026-08-02-grey-flowers-authentication-system.md) 的 Principal 与 `require-role('ADMIN')`

本文授权：切片 4 涉及的 contracts 新增 `activities.ts` 与 `music.ts` 的 `activityId→activityCount` 修订、**一条多对多迁移 `ActivityMusic`（拆 `Music.activityId` 单外键）**、API 活动模块（管理 + 公开）与音乐服务读投影小改、Admin 动态 feature（Composer + 列表 + 音乐/图片选择器）+ 导航、主站动态读路径迁移。**不涉及**评论读写（切片 5）；不引入自动化测试框架。

本文基于对旧 `nuxt-admin`（/Users/nonhana/code_life/blog/nuxt-admin）动态实现的行为盘点、当前 schema 精确读取与主站读取契约的逐字段核对；不复制其 Nuxt API、Prisma 直连或页面内 DTO。

## 一、决策记录（本切片定案，2026-08-05 与 Hana 讨论锁定）

| 决策点 | 决定 | 理由 / 备注 |
| --- | --- | --- |
| Composer 形态 | **单组件 + AppDialog 统一**（桌面居中宽对话 / 移动全屏 sheet），创建与编辑复用同一 composer | 「最常用=最高频触达」+「多端一致」；`AppDialog` 本身已双端自适应，一份代码 |
| 动态·图片关系 | **多对多（schema 已是）**：`ActivityImageAsset` 复合主键，一张图片资产可被多条动态引用 | `@@id([activityId, assetId])` 无跨动态排他；`position` 仅限单动态内排序 |
| 动态·音乐关系 | **多对多（本次新增 `ActivityMusic` 连接表）**，替代 `Music.activityId` 单外键 | Hana 明确「一个音乐可被多个动态引用」；单外键表达不了 |
| `ActivityMusic` 是否带 position | **不带**。展示顺序按 `music.id ASC` 稳定排序，不做音乐重排 | 与旧行为一致（从未持久化音乐顺序）；未来需要再加列 |
| `Music.activityId` 处置 | **干净切离**：回填 `ActivityMusic` 后 `DROP COLUMN`，不留双写 | 符合 clean-cutover；避开「删列 vs 双写」不一致 |
| `musicAdminSchema` 修订 | 去掉只读 `activityId`，**新增 `activityCount: number`**；`inActivity` 保留（= activityCount>0） | 切片 3 的「切片 4 放开 activityId 写」预售被 M2M 推翻，属本切片授权的契约演进；`music-card` 的 `inActivity` 角标不受影响 |
| 图片输入 | 受管资产（`assetId`）与外部 URL（`url`）**混合有序数组**；`images[]` 存归一后的有序 deliveryUrl/外部 URL | 主站只读 `Activity.images`（裸 URL 数组，允许外部 URL）；外部 URL 不被静默重写（切片 2 纪律）；`ActivityImageAsset.position`=images 下标 |
| 图片上限 | **9 张**（3×3 网格） | 与主站 PhotoGrid 1/2/3/4 布局兼容；超出禁用附加并提示 |
| 音乐上限 | **12 首** | 拾取器可管理；无排序 |
| 正文 | **受限 Markdown 移植**：禁 heading/html/image/table，15 标签白名单 + rehype-sanitize，`remark-mdc:false`、`rehype-raw:false`，8 192 字符上限，空正文 → `contentMarkdown=null` | 原样移植旧 `activity-markdown.ts`；8192 超限由 Zod 拦成 `VALIDATION_FAILED`（不再用 413）|
| commentCount | **API 计算**（Comment `groupBy path` 只读投影，与主站现逻辑一字不差），公开 DTO 直接带 | 主站 adapter 纯透传、删净 Prisma 直读；评论完整读写仍归切片 5 |
| 时间契约 | API 返回 ISO；主站 adapter 沿用 `formatDateTimeYmdHms` 转本地 `YYYY-MM-DD hh:mm:ss` | 切片 2 先例；API 契约中性 |
| 删除语义 | 拒绝旧 `deleteImages` 参数；删动态 = 断音乐连接 + 删记录（级联清 `ActivityImageAsset`），资产留库 | 资产生命周期归切片 1；孤儿由资产库 `PENDING_CLEANUP` 治理 |
| 导航 | 桌面 rail「内容」组加「动态」；移动 end tab 置换为 **文章/动态/资产/更多**，音乐库入「更多」sheet | 最常用功能保持一级触达 |
| 明确不做 | 音乐排序/重排、定时/排期发布、草稿/版本/乐观锁（动态短内容编辑即改）、正文内嵌图片（受限 md 拒绝 image 语法）、评论读写、自动化测试框架 | 与内容发布切片刻意区分：动态不建 autosave/快照 |

## 二、运营结果与完成边界

管理员完成结果：**轻量快捷地编写、编辑、删除动态；上传、排序、查看动态图片；从音乐库选择音乐关联；桌面与移动端一致的发布体验。**

完成边界（闭环）：

1. 资产正确性（Image）：动态图片必须是 `ACTIVITY_IMAGE` 且 `AVAILABLE` 的 IMAGE 资产；`images[]` 与 `ActivityImageAsset`（position）归一一致；一张资产可被多条动态引用（多对多）；被引用的资产删/清理仍被 `ASSET_REFERENCED` 阻止。
2. 资产正确性（Music）：音乐关联走多对多 `ActivityMusic`；一条音乐可被多条动态引用；`MusicService` 读写与 `musicAdminSchema` 在切片 3 契约上仅按 §一修订，不破坏 `Track` 公开读。
3. 正文正确性：`content` 原样存 Markdown；`contentMarkdown` 为受限解析产物，空正文落 SQL NULL；heading/html/image/table 被明确拒绝并给出中文文案；8192 上限生效。
4. 公开/管理分离：管理接口出全量（含草稿概念不存在——动态无发布态，创建即公开）；公开接口返回与主站 `ActivityItem` 逐字段一致（含 `contentMarkdown`、`commentCount`）。
5. 多端一致：Composer 桌面居中对话 / 移动全屏 sheet，同一组件；图片多选/进度/失败重试/重排/灯箱、音乐多选拾取在 375px 单列可完整走通。
6. 主站迁移：`list`/`single` 读路径只经 API，主站 Prisma 直读与 `activity-serializer.ts` 删除；SSR 与浏览器行为经 API 验证；`#shared/types/activity.d.ts` 与 RSS 零改动。

## 三、行为清单（旧 nuxt-admin 动态实现的采纳/调整/拒绝）

| 旧行为 / 主站行为 | 处置 | 结论 |
| --- | --- | --- |
| 创建：`content ≤8192` + `images: z.url[]` + `musicIds` connect；`publishedAt/editedAt` 走 DB 默认 | 采纳（调整） | 保留字段与 DB 默认语义；`musicIds` 改 M2M 连接表写入；`images` 改 assetId/url 混合 + position；音乐不存在或资产非法 → 明确 `VALIDATION_FAILED`（旧实现 P2025→500）|
| 受限 Markdown（禁 heading/html/image/table；15 标签白名单；空正文→null） | 采纳 | 逐字移植 `activity-markdown.ts` 到 API `modules/activities/activity-markdown.ts`；8192 由 Zod 拦（400）|
| 列表：`content` insens 搜索 + `publishedAt desc` + 分页 | 采纳（调整） | 参数对齐项目 `page/pageSize`；音乐给完整 `Track`（旧列表只给 4 字段，现需可点播）|
| 详情：完整 Activity + music | 采纳（调整） | 管理 DTO 不含 `contentMarkdown`（Admin 不渲染 AST）；公开 DTO 含（渲染需要）|
| 更新：`musicIds` set:[]→connect；images 整组替换；content 成对写 contentMarkdown | 采纳（调整） | 同语义移入单事务；M2M 改为「删当前连接 + 重建」|
| 删除 `deleteImages` 参数（删 R2 图） | **拒绝** | 资产生命周期归切片 1；删动态只断连接 + 删记录，图片/音源资产留库 |
| `z.coerce.boolean` 的 `deleteImages` 布尔陷阱 | 拒绝 | 参数整体移除，无此问题 |
| 主站 `ActivityItem`（id/content/contentMarkdown/images/music/commentCount/publishedAt/editedAt） | 采纳 | 公开 DTO 逐字段对齐；时间经 adapter 本地化 |
| 主站 `commentCount` path 约定 `/recently?id=<id>` | 采纳 | API 以同一 `groupBy path` 只读投影计算 |

## 四、数据模型与数据库迁移

### 修改（`packages/db/prisma/schema.prisma` + 一次迁移 `activity-music-m2m`）

```prisma
model Activity {
  id              Int                   @id @default(autoincrement())
  content         String                @default("")
  images          String[]              @default([])
  publishedAt     DateTime              @default(now())
  editedAt        DateTime              @updatedAt
  contentMarkdown Json?
  imageAssets     ActivityImageAsset[]
  music           ActivityMusic[]        // ← 由 Music[] 改为多对多连接
}

model Music {
  // —— activityId Int? 与 activity Activity? 删除 ——
  // 其余字段（title/src/sourceAssetId/seconds/album/artist/cover/coverAssetId/createdAt）不动
  activities ActivityMusic[]             // ← 新增多对多连接
}

model ActivityMusic {                     // ← 新增（多对多，无 position）
  activityId Int
  musicId    Int
  activity   Activity @relation(fields: [activityId], references: [id], onDelete: Cascade)
  music      Music    @relation(fields: [musicId], references: [id], onDelete: Cascade)

  @@id([activityId, musicId])
  @@index([musicId])
}
```

`ActivityImageAsset` **零改动**（图片本就是多对多）。

### 迁移规则

1. 在一次性临时库以 `pnpm --filter @grey-flowers/db run prisma:migrate:dev -- --create-only --name activity-music-m2m` 生成迁移草稿。
2. 审查并手工校正 SQL（生成物通常不自动带回填与精确 DROP 顺序，逐条核对）：
   - `CREATE TABLE "ActivityMusic" ("activityId" INTEGER NOT NULL, "musicId" INTEGER NOT NULL, CONSTRAINT "ActivityMusic_pkey" PRIMARY KEY ("activityId","musicId")); CREATE INDEX "ActivityMusic_musicId_idx" ON "ActivityMusic"("musicId");` 外加两条外键（`ON DELETE CASCADE`）。
   - **回填存量**（顺序在删列之前）：`INSERT INTO "ActivityMusic" ("activityId","musicId") SELECT "activityId","id" FROM "Music" WHERE "activityId" IS NOT NULL;`
   - `ALTER TABLE "Music" DROP COLUMN "activityId";`（级联释放旧外键与索引）
   - **不得触碰其他领域表、不重写存量行**。
3. `pnpm prisma:generate` 后提交 schema + 迁移 SQL。
4. 排序 `music.id ASC` 保证确定性（连接表无 position）。

## 五、Contracts 变更（`packages/contracts/src/`）

### 新增 `activities.ts`，并在 `index.ts` 再导出

```ts
import { musicTrackSchema } from './music.js';

// —— 图片输入项：受管资产 或 外部 URL（遗留图片保留，不重写）——
export const activityImageItemSchema = z.union([
  z.object({ assetId: z.number().int().positive() }).strict(),
  z.object({ url: z.url() }).strict(),
]).describe('受管资产或外部 URL，条目顺序即展示顺序');
export type ActivityImageItem = z.infer<typeof activityImageItemSchema>;

// —— 创建输入 ——
export const activityCreateInputSchema = z.object({
  content: z.string().max(8192, '动态内容不能超过 8192 个字符').default(''),
  images: z.array(activityImageItemSchema).max(9, '最多 9 张图片').optional(),
  musicIds: z.array(z.number().int().positive()).max(12, '最多 12 首音乐').optional(),
}).strict();
export type ActivityCreateInput = z.infer<typeof activityCreateInputSchema>;

export const activityUpdateInputSchema = z.object({
  content: z.string().max(8192, '动态内容不能超过 8192 个字符').optional(),
  images: z.array(activityImageItemSchema).max(9, '最多 9 张图片').optional(),
  musicIds: z.array(z.number().int().positive()).max(12, '最多 12 首音乐').optional(),
}).strict();
export type ActivityUpdateInput = z.infer<typeof activityUpdateInputSchema>;

// —— 管理 DTO（列表/详情同款；Admin 不渲染 AST → 无 contentMarkdown）——
export const activityImageOutputSchema = z.object({
  assetId: z.number().int().positive().nullable(),   // 受管资产 id；外部 URL 为 null
  url: z.url(),                                       // 展示 URL
}).strict();
export const activityAdminSchema = z.object({
  id: z.number().int().positive(),
  content: z.string(),
  images: z.array(activityImageOutputSchema),
  music: z.array(musicTrackSchema),                   // 顺序 = music.id asc
  publishedAt: z.iso.datetime(),
  editedAt: z.iso.datetime(),
}).strict();
export type ActivityAdmin = z.infer<typeof activityAdminSchema>;

export const activityListQuerySchema = z.object({
  search: z.string().max(100).optional(),             // 匹配 content（insensitive）
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
}).strict();
export type ActivityListQuery = z.infer<typeof activityListQuerySchema>;
export const activityListDataSchema = z.object({
  items: z.array(activityAdminSchema), total: z.number().int().min(0),
  page: z.number().int().min(1), pageSize: z.number().int().min(1).max(100),
}).strict();
export const activityListResponseSchema = apiSuccessSchema(activityListDataSchema);
export const activityAdminResponseSchema = apiSuccessSchema(activityAdminSchema);

// —— 公开 DTO（主站 ActivityItem 逐字段对齐；列表与详情同款，因首页横轨把列表项直接喂详情弹窗渲染 markdown）——
export const activityPublicSchema = z.object({
  id: z.number().int().positive(),
  content: z.string(),
  contentMarkdown: z.any().nullable(),                // mdc AST（hast body/data/...）Json 透传
  images: z.array(z.url()),                           // 裸 URL 数组（主站唯一读源）
  music: z.array(musicTrackSchema),
  commentCount: z.number().int().min(0),
  publishedAt: z.iso.datetime(),
  editedAt: z.iso.datetime(),
}).strict();
export type ActivityPublic = z.infer<typeof activityPublicSchema>;
export const activityPublicListDataSchema = z.object({
  items: z.array(activityPublicSchema), total: z.number().int().min(0),
  page: z.number().int().min(1), pageSize: z.number().int().min(1).max(100),
}).strict();
export const activityPublicListResponseSchema = apiSuccessSchema(activityPublicListDataSchema);
export const activityPublicResponseSchema = apiSuccessSchema(activityPublicSchema);
```

### 修订 `music.ts`（切片 3 契约，本切片授权）

- `musicAdminSchema`：删除 `activityId: z.number().int().positive().nullable()`，**新增 `activityCount: z.number().int().min(0)`**；`inActivity` 保留（语义 `activityCount > 0`）。
- 其余（`musicTrackSchema`/`MusicCreateInput`/`MusicUpdateInput`/`musicParse*`/公开读）不动。

**错误码**：无新增。复用 `VALIDATION_FAILED`（content 超长、图片资产非法/超限、音乐不存在/超限）、`NOT_FOUND`、`INTERNAL_ERROR`、`ASSET_REFERENCED`（资产侧阻塞，已存在）。

## 六、apps/api 变更

### 6.1 音乐服务读投影小改（`modules/music/contracts.ts` + `service.ts`）

- `musicAdminSelect`：`activityId: true` → `_count: { select: { activities: true } }`（其余字段不变）。
- `toMusicAdmin`：`activityId: record.activityId` → `activityCount: record._count.activities`；`inActivity: record._count.activities > 0`。
- 公开读（`listPublic`/`detailPublic`/`toMusicTrack`）不受影响；`create`/`update`/`remove` 不涉 `activityId` 写入、逻辑不变（`remove` 删音乐时 `ActivityMusic` 连接经 `onDelete: Cascade` 自动清理）。

### 6.2 新增 `modules/activities/`（activity-markdown / contracts / service / routes）

**`activity-markdown.ts`** —— 原样移植旧 `activity-markdown.ts`：`activitySchema`（15 标签：p/br/strong/em/del/a/blockquote/ul/ol/li/code/pre/span/style；`a` 属性 className/href/target(_blank|_self)/rel；`code` className；`pre` shiki 属性 + style；`span` className/style；protocols href http/https/mailto；clobberPrefix `activity-`）、`validateActivityMarkdownAst`（拒 heading/html/image/table，文案「发布失败：动态不支持标题、HTML、图片、表格」，cause 哨兵区分规则失败与真实异常）、`parseActivityMarkdown`（`@nuxtjs/mdc/runtime` `parseMarkdown`，`contentHeading:false`、`toc:false`、`remark-mdc:false`、`rehype-raw:false`、external-links `_blank + noopener/noreferrer/nofollow/ugc`、sanitize）。空正文 → `DbNull`；内容超长由 Zod 前置拦截，本函数不再返回 413。

**路由表**

| 管理（ADMIN，挂 `/activities`） | 公开（匿名，挂 `/public/activities`） |
| --- | --- |
| `POST /`（创建） | `GET /list?page&pageSize`（`ActivityItem[]`，publishedAt desc, id desc） |
| `GET /`（列表：+search content + 分页） | `GET /:id`（单条，404） |
| `GET /:id`（详情） | |
| `PATCH /:id`（编辑：content/images/musicIds 各自可选整组替换） | |
| `DELETE /:id`（删记录 + 断音乐连接；不动资产） | |

**service 要点（沿用 `ArticleService`/`MusicService` 的 `$transaction` + `ApiError` 风格）**

- `create(principal, input)`（单事务）：
  1. `content` 非空 → `parseActivityMarkdown`；失败 → `VALIDATION_FAILED`（message 带中文文案）；空 → `contentMarkdown = DbNull`。
  2. `images` 归一：对每个条目依次（记录 position=i）——`assetId` → 校验资产存在/`AVAILABLE`/`mediaType=IMAGE`/purpose=`ACTIVITY_IMAGE` → `url=deliveryUrl`；外部 `url` → 原样保留、无连接行。产物 `images: string[]` = 有序 URL 数组；`ActivityImageAsset` 用 deleteMany+createMany（或 create 对每个 assetId，position=i）。
  3. `musicIds`：逐条校验音乐存在（`NOT_FOUND` 或 `VALIDATION_FAILED`）；多对多直接 `createMany` 到 `ActivityMusic`（无占用排他），`musicIds` 去重后排序可忽略（展示按 id asc）。
  4. `publishedAt` 用 DB `@default(now())`；`editedAt` 由 `@updatedAt`。
- `update(id, input)`（单事务）：存在性检查（`NOT_FOUND`）；`content` 提供 → 重新解析 + 成对写；`images` 提供 → 整组替换（删旧 `ActivityImageAsset` + 重建 + 更新 `images`）；`musicIds` 提供 → `activityMusic.deleteMany({ activityId })` + 重建（断连重连语义）。
- `remove(id)`：`NOT_FOUND` 检查；`activityMusic.deleteMany({ activityId })`（或依赖活动删除级联）+ `activity.delete`；不动资产与音乐记录。
- `list(query)`：`where = content contains insensitive`；`orderBy publishedAt desc, id desc`；分页；select 含 `imageAssets { position, asset { storageKey } }` 与 `music { select: musicTrackSelect, orderBy: { id: 'asc' } }`；DTO 构造 `images: [{ assetId|null, url }]`（url 从 `images[]` 按下标取，assetId 由 position 映射）。
- `listPublic(query)` / `detailPublic(id)`：同 select；`contentMarkdown` 原样透传；`commentCount` 经 `comment.groupBy({ by:['path'], where:{ path:{ in: paths } }, _count:{ _all:true } })`（paths = `/recently?id=<每个 id>`，正则提取，缺省 0）；时间 ISO 出，本地化交主站 adapter。

### 6.3 挂载

- `apps/api/src/app.ts`：`app.route('/activities', createActivityRoutes(dependencies))`、`app.route('/public/activities', createActivityPublicRoutes(dependencies))`（CORS 方法已含全部所需）。
- `apps/api/src/bootstrap/dependencies.ts`：`ActivityService`（构造注入 prisma/environment）加入 `AppDependencies`。

### 6.4 依赖（阶段 0 准入）

- API 新增 `rehype-sanitize`（ESM/Node24 校验；`hast-util-sanitize` 为传递依赖，与旧实现同源）。`@nuxtjs/mdc` 已在本仓 API 依赖（`inline-assets.ts` 已在用 `@nuxtjs/mdc/runtime` 的 `parseMarkdown`），无需新增。

## 七、apps/admin 变更

### 7.1 路由与导航

- `routes/route-tree.tsx`：新增 `/activities`（lazy 页）。
- `app/shell/console-shell.tsx`：桌面 rail「内容」组加 `{ icon: Feather/Send, label: '动态', path: '/activities' }`；移动端 `MobileTabBar` 置换为 **文章/动态/资产/更多**（动态用 `PenLine`），音乐库移入 `MoreSheet`（与分类/标签并列）。

### 7.2 `app/api/activities.ts` + `ApiClient`

`createActivitiesApi(http)`：`list(query)`/`detail(id)`/`create(input)`/`update(id, input)`/`remove(id)`，沿用 `createMusicApi` 的 schema + authenticated 封装；`ApiClient` 增加 `readonly activities`。

### 7.3 `features/activities/`

- `composer.tsx` —— **核心可复用组件**（新建与编辑同一组件；`AppDialog size="lg"`，双端自适应）：
  - 正文：auto-grow 文本区（优先复用 `TextAreaField`，无自动增高则内联轻量 textarea），占位「分享此刻…」，字数计（>7900 提示，8192 上限），**Cmd/Ctrl+Enter 发布**；
  - 图片：`添加图片`（multiple，`accept=IMAGE_ACCEPT`）或拖拽入区 → 并行 `assets.upload({ file, purpose: 'ACTIVITY_IMAGE' }, setProgress)`，单张 `ProgressBar`、失败单张重试/移除；缩略图网格（`AssetImage` + 序号 + 上移/下移 + 移除；桌面可拖拽重排；点击开灯箱）；上限 9；
  - 音乐：`添加音乐` → `MusicPickerDialog`（见下）→ 已选卡片（封面 + 标题/艺术家 + 移除）；上限 12；
  - 底部：取消 / 发布（solid + `isLoading` + 发布中禁用；`canSubmit = content.trim() || images.length || music.length`，允许纯图/纯音乐动态）。
- `music-picker.tsx` —— `MusicPickerDialog`：数据源 `music.list({ search, page, pageSize })`（搜索 title/artist/album + 分页），多选，条目显示封面/标题/艺术家/时长与 `inActivity` 角标；确认回填选择的 `musicIds`。
- `list-page.tsx` —— feed：搜索（content）+ 分页 + 空/骨架/失败重试；卡片 = 内容预览（line-clamp）+ 图缩略 + 音乐 chips（点击 → `usePlayerStore.play(tracks, index)` 跨路由点播）+ 时间 + 编辑/删除。顶部「发动态」solid 按钮（移动端另加页面级 FAB）→ Composer；发布成功 → 关 dialog + toast + 列表置顶刷新。
- `activity-card.tsx`、`display.ts`（时间 `formatDateTime` 等已有工具）。
- 编辑：卡片「编辑」→ Composer 预填（`content`、`images` 的 assetId→受管条目映射、`musicIds`）→ `update`。
- 删除：`ConfirmDialog`（披露「图片与音乐资产保留在资产库」）→ `remove` → 若含当前播放中的音乐条目，调用 `usePlayerStore.removeTrack(id)`（对齐音乐库删除语义）。
- `features/music/detail-page.tsx`：仅将「是（动态 #N）」行改用 `activityCount`（如「是（N 条动态）」）；`music-card.tsx` 的 `inActivity` 角标不变。

### 7.4 设计语言校验

新 UI 全部复用 `@/ui/index.js` 既有原语（`PageHeader/PageBody/Panel/MetaLine/EmptyState/Skeleton/AppDialog/BottomSheet/TextField/TextAreaField/SearchInput/AssetImage/StatusReadout/ConfirmDialog` 等）；不引入新主题变量、不新造样式；移动端沿用「悬浮元素 + 全屏 sheet + 键盘避让（`use-keyboard-inset`）」范式。`lucide-react` 图标。

## 八、apps/main 迁移

- `server/api/activity/list.get.ts`：改 `apiGet<ActivityPublicListData>('/public/activities/list', { page, pageSize })` → 逐项把 ISO 时间 `formatDateTimeYmdHms` 本地化 → 返回原 `formattedEventHandler` envelope `{ payload }`；分页默认 1/20 语义保持。
- `server/api/activity/single.get.ts`：改 `apiGet<ActivityPublic>('/public/activities/:id')` → 本地化 → `{ payload }`；id 非法 → 原 400 envelope；`ApiGatewayError` 且 `code === 'NOT_FOUND'` → 原 404 envelope。
- 删除：`server/utils/activity-serializer.ts`；`prismaShortcut.ts` 中 `activityWithMusicArgs`（含 `activityMusicSelect`）与其 Activity 相关导出。**保留** `commentSelectObj`/`childCommentArgs`/`parentCommentArgs`（评论区仍属切片 5）。
- `apps/main/app/*`、`#shared/types/activity.d.ts`、RSS：**零改动**（RSS 本就不含动态）。

## 九、验收与证据（按切片文档 §每个切片的交付闭环）

人工验收矩阵至少覆盖：

1. 静态门禁：`pnpm typecheck`、`pnpm lint`、`pnpm fmt:check`、`pnpm build`（全 workspace）绿。
2. 迁移：SQL 仅含建 `ActivityMusic`（含双 `ON DELETE CASCADE` 外键 + musicId 索引）、一条回填 INSERT、`ALTER TABLE "Music" DROP COLUMN "activityId"`；临时库构造「已有 activityId 的 Music」验证回填后连接完整、删列无残留；`pnpm prisma:generate` 后 schema 一致。
3. API 管理接口（本地 dev）：
   - `POST /activities`：纯文本/纯图/纯音乐/混合各创建成功；空正文 → `contentMarkdown null`；含 `# 标题`/内嵌 `![](url)`/`<div>`/`| 表格 |` → `400 VALIDATION_FAILED` 且中文文案含「动态不支持标题、HTML、图片、表格」对应项；>8192 → 400。
   - images 归一：assetId 指向非 `ACTIVITY_IMAGE`/非 AVAILABLE → 400；外部 URL 保留原样；顺序与 `ActivityImageAsset.position` 一致；>9 → 400。
   - musicIds：不存在 id → 400；M2M——同一音乐连到动态 A 后再连动态 B 成功（A、B 并行存在）；PATCH 换 musicIds → 旧连接清除、新连接建立；同一音乐在多条动态的公开 DTO 均携带。
   - `GET /activities`：search 命中 content；分页；`publishedAt desc, id desc`；`images` 的 assetId/url 映射正确；music 按 id asc。
   - `DELETE /activities/:id`：记录删除、`ActivityImageAsset` 级联清、音乐记录保留（连接清除）、资产保持 AVAILABLE。
   - 权限：USER token → `403 AUTH_FORBIDDEN`；不存在 id → `404`。
4. 资产边界：被动态引用的图片资 PENDING_CLEANUP → `409 ASSET_REFERENCED`；删除动态后再置可成功；被音乐引用的「删音乐」→ 连接级联清理、资产引用关系释放。
5. 公开读：`GET /public/activities/list` 与 `:id` 与主站 `ActivityItem` 逐字段一致（含 `contentMarkdown`、`commentCount`、music `Track`）；已删动态公开 404。
6. Admin 浏览器（1440×900 与 375×780）：
   - 列表：feed 渲染、搜索、分页、空态/骨架/失败重试；动态入口（桌面 rail + 移动 tab）到位；点音乐 chips 跨路由播放。
   - Composer：新建纯/图/音乐/混合；Cmd/Ctrl+Enter；多图并行上传进度 + 单张失败重试 + 拖拽/按钮重排 + 灯箱 + 上限 9；音乐拾取器搜索/多选/`inActivity` 角标/移除；发布后关 dialog + 列表置顶；375px 全屏 composer 键盘避让、底部操作可见可点。
   - 编辑：回填（content/images/musicIds 含受管映射）→ 保存生效。
   - 删除：ConfirmDialog 披露资产保留；删除含播放中音乐的动态后播放器队列清理不崩溃。
   - 音乐详情页：`activityCount` 显示正确（多动态引用时计数 >1）。
7. 主站：无前端改动；`/api/activity/list` 与 `/single` 经 API 返回，SSR 页面与浏览器行为一致；RSS 无动态不受影响。

## 十、实施任务拆分（按序，均待授权）

0. **阶段 0 验证**：① `rehype-sanitize` 依赖准入 + `@nuxtjs/mdc/runtime parseMarkdown` 在 API（Hono/tsdown/Node24/本仓 @nuxtjs/mdc 版本）对真实活动语料的提取正确性（hast body/data、validator 拦截、sanitize 白名单）；② 迁移草稿在临时库的回填与删列无损（构造含 activityId 的 Music 样例）；③ `musicAdminSchema` 改 `activityCount` 后 api/admin 编译闭合。
1. contracts：`activities.ts` + `index.ts` 再导出；`music.ts` 的 `activityId→activityCount` 修订。
2. 迁移：`ActivityMusic` + 删 `Music.activityId`；`pnpm prisma:generate`。
3. api：`modules/activities/`（activity-markdown/contracts/service/routes）+ 音乐读投影小改 + `app.ts`/`dependencies.ts` 挂载。
4. admin：`app/api/activities.ts` + ApiClient；`features/activities/`（composer/music-picker/activity-card/list-page/display）+ shell 导航与 route-tree + 音乐详情页 `activityCount`。
5. 主站：`list.get.ts`/`single.get.ts` 薄适配；删除 `activity-serializer.ts` 与 `prismaShortcut.ts` activity 部分。
6. 验收：§九全矩阵人工验收 + 证据附录（追加到本文 §十三）。

## 十一、风险与已记录的后顾

- **拆 `Music.activityId` 的契约波及**：`musicAdminSchema`/`musicAdminSelect`/`toMusicAdmin` 与 admin 音乐详情页随迁；`Track` 公开读与 `MusicCreate/UpdateInput` 不受影响。回填是唯一数据保全点，迁移在临时库先行验证。
- **`parseMarkdown` 在 API 端的版本差异**：主站与旧项目行为以 `@nuxtjs/mdc` 当前版本为准；阶段 0 以真实语料验证解析与拒绝文案，不保证旧版本逐字节一致（行为契约以拒绝/白名单为硬边界）。
- **图片 M2M 语义确认**：同一资产跨多条动态引用在 assets 侧表现为多行 `ActivityImageAsset`；删一条动态只释放该动态的连接行，资产仍被其余动态引用时仍 `ASSET_REFERENCED`。
- **音乐顺序非持久化**：展示按 `music.id asc`；若未来需动态内音乐排序，为 `ActivityMusic` 加 `position` 列再授权，不影响本切片合同。
- **`contentMarkdown` 透传未校验**：公开 DTO 以 `z.any()` 透传 AST，主站渲染器早已按 `body` 存在与否降级（`#empty` 槽），无新攻击面（AST 产自受限解析器，未经浏览器直写）。
- **无自动化测试框架**（设计定案）：Composer/上传/播放等交互路径依赖 §九.6 人工矩阵与证据记录。

## 十二、本次讨论定案记录（2026-08-05）

- Composer 形态：单组件 + AppDialog 双端统一；创建/编辑复用。
- 动态⇄音乐：**多对多**（新增 `ActivityMusic`，无 position，回填后删 `Music.activityId`）——用户明确「一个音乐可被多个动态引用」；动态⇄图片本已多对多（`ActivityImageAsset`）。
- commentCount：API 计算（Comment groupBy path 只读投影）。
- 移动导航：底部 tab 置换为 文章/动态/资产/更多，音乐库入「更多」。
- 图上限 9、音乐上限 12；图片支持受管资产 + 外部 URL 混合有序数组；拒绝 `deleteImages`；不做草稿/版本/定时发布与音乐排序。

## 十三、实施证据附录（2026-08-05 完成）

### 静态门禁（§九.1）

`pnpm typecheck`、`pnpm lint`、`pnpm fmt:check`、`pnpm build`（全 workspace）全部 exit 0。

### 迁移（§九.2）

- 草稿在一次性临时库生成（`slice4_tmp`，`migrate dev --create-only --name activity-music-m2m`），手工校正为：建 `ActivityMusic`（双 `ON DELETE CASCADE` 外键 + `musicId` 索引）→ 回填 `INSERT ... SELECT activityId, id FROM "Music" WHERE "activityId" IS NOT NULL` → 删 `Music_activityId_fkey` → `DROP COLUMN "activityId"`。
- 在 `slice4_verify` 库构造「2 条活动 + 3 首音乐（2 首带 activityId）」验证：回填 2 条连接 `(1,10),(1,11)`、`Music.activityId` 列 0 残留、Music 行完整、外键 `confdeltype=c`。
- 已提交迁移 `20260804181723_activity_music_m2m`；`pnpm prisma:generate` 后 schema 一致。
- 说明：本地 dev 库 `greyflowers_admin_test` 存在 3 条历史漂移记录（`add_auth_sessions` FAILED、后两条未记录但 schema 已含），已按真实 schema 状态 `migrate resolve --applied` 后 deploy 成功。

### API 管理/公开接口（§九.3/4/5）—— 自动化矩阵 46/46 PASS

覆盖：纯文本/空正文/受限 md 拒绝（标题/HTML/图片/表格，中文文案 + `VALIDATION_FAILED`）/8192 上下限/混合图片（受管+外部 URL 顺序与 position 映射）/非 `ACTIVITY_IMAGE` 资产拒绝/10 图拒绝/musicIds 存在性校验/M2M 复用（同音乐连两条动态）/列表 search·分页·`publishedAt desc, id desc`/PATCH 断旧连新与 content→contentMarkdown 成对写/USER→403/不存在→404/引用中资产 `PENDING_CLEANUP → ASSET_REFERENCED`/公开 list·detail 与 `ActivityItem` 逐字段一致（含 `contentMarkdown`、`commentCount`，Comment `groupBy path` 投影）/删除级联清连接、音乐与资产保留、资产释放。

### Admin 浏览器（§九.6，1440×900 与 375×780）

- 导航：桌面 rail「内容·动态」、移动 tab 文章/动态/资产/更多（动态 `PenLine`）、音乐库入「更多」sheet。
- 发布：Composer 复用创建/编辑；Cmd/Ctrl+Enter 发布后关 dialog + 列表置顶刷新；发布按钮在空态禁用、纯图/纯音乐/混合可发。
- 图片：多选上传 + 单张进度 + 失败重试/移除；按钮重排与 HTML5 拖拽（draggable）重排；点击缩略图开灯箱；上限 9 提示。修复了两处交互缺陷：hover 操作层拦截缩略图点击（改为底部条 + pointer-events 穿透）、壳层 `index.html` 残留切换脚本碎片。
- 音乐：拾取器搜索/多选/`inActivity` 角标/时长/移除；发布后 `ActivityMusic` 落库正确。
- 编辑：预填 content/受管图片映射/musicIds → 保存生效。
- 删除：`ConfirmDialog` 披露「图片与音乐资产保留在资产库」；删除含播放中音乐的动态后播放器队列清理、页面不崩。
- 音乐详情页：`是（N 条动态）` 计数正确（多动态引用时 >1）。

### 主站（§九.7）

- `server/api/activity/list.get.ts` / `single.get.ts` 改为 `apiGet` 薄适配 + ISO→本地 `YYYY-MM-DD hh:mm:ss`；`payload` 保持原契约（list 为 ActivityItem 数组、single 为单对象）。
- 删除 `server/utils/activity-serializer.ts` 与 `prismaShortcut.ts` 的 activity 部分（comment selects 保留给切片 5）。
- `/api/activity/list`、`/single?id=` 经 API 返回；`/recently` SSR 200 且浏览器路径渲染音乐 chips、图片、本地化时间；404/400 envelope 语义保持；`#shared/types/activity.d.ts` 与 RSS 零改动。

### 顺带修复（前序会话遗留，非本切片引入）

- `apps/admin/index.html` 残留无 `<script>` 包裹的主题脚本碎片（构建产物页面顶部渲染出乱码文本），已按文档约定移除；`scripts/theme-init.ts`、`theme-toggle.tsx`、`inspector-pane.tsx`、`vite/theme-script-plugin.ts`、`apps/admin/tsconfig.json` 补齐 oxfmt 格式。
