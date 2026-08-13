# Grey Flowers 音乐库切片专项设计（切片 3）

## 状态与用途

- 决策日期：2026-08-04
- 状态：已实施（2026-08-04 验收完成，证据见 §十三）
- 文档类型：专项设计与实施任务边界（本切片实现的 SSOT）
- 读者：本切片的 contracts、API、Admin 音乐库与播放器、验收维护者
- 前置约束：
  - [admin-operational-workflow-slices.md](../design/admin-operational-workflow-slices.md) 的切片 3（音乐库）与本切片 §「音乐库与动态发布分开交付」
  - [2026-08-01-hono-backend-architecture.md](../design/2026-08-01-hono-backend-architecture.md) 的公开读/管理写两套 Interface
  - [2026-08-01-react-frontend-architecture.md](../design/2026-08-01-react-frontend-architecture.md) 的 feature 纵切与「不建第二套上传规则」纪律
  - [2026-08-02-managed-assets-slice.md](./2026-08-02-managed-assets-slice.md)（切片 1，已完成验收）的 Asset 用例、`MUSIC_SOURCE`/`MUSIC_COVER` 两种 purpose、上传协议与引用计数
  - [2026-08-03-content-publishing-slice.md](./2026-08-03-content-publishing-slice.md)（切片 2，已完成验收）的 Module/Admin 范式、`src`/`cover` 与资产 id 的归一逻辑、验收闭环
  - [2026-08-02-grey-flowers-authentication-system.md](./2026-08-02-grey-flowers-authentication-system.md) 的 Principal 与 `require-role('ADMIN')`

本文授权：切片 3 涉及的 contracts 新增 `music.ts`、`Music.createdAt` 迁移、`ObjectStorage.getObject` 适配器扩展与 `AssetService` 单写入路径内部重构、API 音乐模块（管理 + 公开）、Admin 音乐库 feature（库页/上传向导/详情/编辑 + 全局播放器）、以及主站音乐公开读契约对齐。**不引入自动化测试框架；不加客户端元数据解析依赖。**

本文基于对旧 `nuxt-admin`（/Users/nonhana/code_life/blog/nuxt-admin）音乐实现的行为盘点与当前 schema 的精确读取；不复制其 Nuxt API、Prisma 直连或页面内 DTO。

## 一、决策记录（本切片定案，2026-08-04 拍板）

| 决策点 | 决定 | 理由 / 备注 |
| --- | --- | --- |
| 元数据解析位置 | **服务端解析**：`POST /music/parse` 读回对象存储音频、用服务端 `music-metadata` 解析 ID3；客户端零新依赖 | 复用切片 1 已引入的服务端 `parseBuffer`；Admin 保持薄；单一元数据真相源；音频上传本就必须发生，「先传后解析」无额外成本 |
| `getObject` 能力 | **扩展 `ObjectStorage`**（R2 经 GetObjectCommand）| 现状只有 put/delete；服务端解析必须读回对象字节 |
| 封面提取落库 | **AssetService 单写入路径内部复用**：新增共享 `persistBuffer` 私有逻辑供 `upload` 与音乐模块封面提取共用；封面作为 `MUSIC_COVER` 受管资产写入对象存储 | 不建第二套上传规则；对象写入、key 命名、孤儿补偿全部收敛在资产用例内 |
| `Music.createdAt` | **新增列 `createdAt DateTime @default(now())`**（本次不新增 `updatedAt`）| 音乐库排序/展示「上传时间」必需；保持最小迁移；排序 `ORDER BY createdAt DESC, id DESC` 保证确定性（存量行同值为迁移时刻） |
| 循环模式 | **off / all / one / shuffle 全带** | 旧实现已成熟，直接移植；shuffle 用 `shuffleHistory` 回退栈 |
| 公开读 | **本切片一并交付 `/public/music`**（list + detail，返回与主站 `Track` 一致的形状）| 为切片 4（活动序列化）铺路，公开读/管理写分离完整成立 |
| 上传入口 | **独立 `/music/upload` 页**，风格对齐 `features/articles/new-article-page` | 字段多于资产上传对话框（元数据表单 + 封面 + 进度），页更适合桌面宽幅与手机单列 |
| `activityId` 写权限 | **本切片只读展示，不接受写入** | 动态关联 UI 属切片 4；设计文档明确「音乐可独立存在，先管理音乐库，再在动态中选择」。DTP 中保留 `activityId`（读）与派生 `inActivity` |
| `seconds` 权威 | **服务端推导**：优先 `Asset.durationMs`，其次 `parseBuffer` 的 `format.duration`；签约输入 DTO 不含 `seconds` | 不信任客户端填的时长 |
| 删除策略 | **删 Music 记录，音源/封面资产保留在资产库**；确认弹窗披露孤儿提示 | 资产生命周期归切片 1（`PENDING_CLEANUP` + `ASSET_REFERENCED`）；重建「delete 带 deleteFile」等旧行为（拒绝）|

**明确不做**：不做歌词、音频可视化、均衡器、第二套上传规则、不把 `activityId` 写入暴露给 Admin、不为本切片改动主站页面代码。

## 二、运营结果与完成边界

管理员完成结果：**上传音频与封面（元数据自动填充）、补齐或编辑音乐元数据、浏览与搜索音乐库、跨页面持续播放音乐（桌面 docked 条 / 移动悬浮 mini + 全屏「正在播放」）、查看单曲信息（元数据/资产/被动态引用状态）、安全移除音乐。**

完成边界（闭环）：

1. 资产正确性：音源必须是 `MUSIC_SOURCE` 且 `AVAILABLE` 的 AUDIO 资产，封面必须是 `MUSIC_COVER` 且 `AVAILABLE` 的 IMAGE 资产；`src`/`cover` 与 `sourceAssetId`/`coverAssetId` 归一一致；`seconds` 服务端权威。
2. 元数据解析：解析成功自动填充 title/artist/album/时长，内嵌封面自动提取为受管 `MUSIC_COVER` 资产；解析失败降级为文件名标题 + 必填封面提示，绝不阻塞流程。
3. 库体验：搜索（title/artist/album 不区分大小写）、分页、按上传时间倒序；空态/骨架/失败重试。
4. 播放器：单例 AudioElement；进入任意曲目后播放器常驻，跨路由导航持续；循环/上一首/下一首/seek/音量/静音/Media Session/锁屏控制；编辑或删除当前曲目有明确状态处理，绝不静默崩溃。
5. 多端适配：桌面 docked 条全控制；移动端悬浮 mini-card 悬于底部 tab 之上，点开全屏「正在播放」（react-modal-sheet）；上传向导在 375px 单列可完整走通。
6. 公开读：`/public/music` 返回与 `activityMusicSelect` 完全一致形状（`Track`），切片 4 可无漂移切换；权限/错误合同一致。
7. 删除安全：删 Music 不动资产；被 Music 引用的资产在资产侧清理/删除仍被 `ASSET_REFERENCED` 阻止（Restrict 语义），删 Music 后引用解除、资产回到可清理。
8. 主站：**零代码改动**（无独立音乐读路径，见 §八）。

## 三、行为清单（旧 nuxt-admin 音乐实现的采纳/调整/拒绝）

| 旧行为 / 主站行为 | 处置 | 结论 |
| --- | --- | --- |
| 上传页「拖拽 → 客户端 music-metadata-browser 解析 → 并行上传 MP3+封面 → 发布」 | 调整 | 保留「自动填充」体验；解析移服务端；音频与封面均走切片 1 `POST /assets/upload` 两笔受管资产，不并行偷传 |
| Pinia 单例 AudioElement + 播放列表 + 循环 off/all/one/shuffle + Media Session | 采纳 | 逻辑原样移植为 React 模块级外部 store；后续状态层迁移为 zustand（见 `2026-08-04-admin-zustand-store-refactor.md`）|
| 底部固定全宽播放条 | 调整 | 桌面保留 docked 条；移动改为底部 tab 之上的悬浮 mini + 全屏「正在播放」面板（不再叠一条全宽 bar，贴合本仓移动设计语言）|
| `/music/index.vue` 卡片网格 + 搜索 + 分页 + 编辑/删除弹窗 | 采纳 | 以 `features/assets/list-page.tsx` 的设计语言重实现，新增 `createdAt` 排序与新导航 |
| `MusicUploader` 封面「内嵌封面 / 手动上传封面 / 移除恢复」三态 | 调整 | 内嵌封面由服务端提取为资产；「更换封面」走资产选择器（`AssetPickerDialog`，MUSIC_COVER）；封面必填 |
| DELETE /music/:id 的 `deleteFile` 参数 | 拒绝 | 资产生命周期归切片 1；删音乐不动资产，孤儿由资产库 `PENDING_CLEANUP` 治理 |
| 页面内 DTO / Prisma 直连 / Nuxt server 路由 | 拒绝 | 走 contracts + Hono 用例 + 受管资产，API 为唯一业务入口 |
| 主站 `Track`（id/title/artist/album/src/seconds/cover）| 采纳 | `/public/music` 契约与 `activityMusicSelect` 一字不差，切片 4 交接 |


## 四、数据模型与数据库迁移

### 修改（`packages/db/prisma/schema.prisma` + 一次迁移）

```prisma
model Music {
  // —— 仅新增 createdAt，其余字段不动 ——
  createdAt DateTime @default(now())   // 入库时间，供库排序与展示
}
```

### 迁移规则

1. 在一次性本地库以 `pnpm --filter @grey-flowers/db run prisma:migrate:dev -- --name add-music-created-at` 生成迁移。
2. 审查 SQL：单条 `ALTER TABLE "Music" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;`（PG11+ 带默认值加列不重写表）；**不得触碰其他领域表**。
3. `pnpm prisma:generate` 后提交 schema + 迁移 SQL。
4. 查询排序统一 `ORDER BY createdAt DESC, id DESC`（存量行 createdAt 同为迁移时刻，id 兜底保证确定性）。

## 五、Contracts 变更（`packages/contracts/src/`）

### 新增 `music.ts`，并在 `index.ts` 再导出

```ts
// 公开读 DTO —— 与主站 `Track`（apps/main/shared/types/activity.d.ts）一字不差
export const musicTrackSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1),
  artist: z.string(),
  album: z.string(),
  src: z.url(),
  seconds: z.number().int().min(0),
  cover: z.url(),
}).strict();
export type MusicTrack = z.infer<typeof musicTrackSchema>;

// 资产摘要 —— 供 Admin 跳资产详情
export const musicAssetSummarySchema = z.object({
  id: z.number().int().positive(),
  storageKey: z.string().min(1),
  deliveryUrl: z.url(),
}).strict();
export type MusicAssetSummary = z.infer<typeof musicAssetSummarySchema>;

// 管理 DTO
export const musicAdminSchema = musicTrackSchema.extend({
  sourceAssetId: z.number().int().positive().nullable(),
  coverAssetId: z.number().int().positive().nullable(),
  activityId: z.number().int().positive().nullable(),   // 只读；关联 UI 在切片 4
  createdAt: z.iso.datetime(),
  inActivity: z.boolean(),                              // activityId 非空派生
  sourceAsset: musicAssetSummarySchema.nullable(),
  coverAsset: musicAssetSummarySchema.nullable(),
}).strict();
export type MusicAdmin = z.infer<typeof musicAdminSchema>;

// 列表查询/响应
export const musicListQuerySchema = z.object({
  search: z.string().max(100).optional(),   // 匹配 title/artist/album
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
}).strict();
export type MusicListQuery = z.infer<typeof musicListQuerySchema>;

export const musicListDataSchema = z.object({ items: z.array(musicAdminSchema), total, page, pageSize }).strict();
export const musicListResponseSchema = apiSuccessSchema(musicListDataSchema);

// 创建/更新 —— seconds 不在输入内（服务端权威）
// 音源必须受管：`sourceAssetId` 必填（外部音源 URL 绕过资产用例，设计文档禁止）。
// 封面允许受管或外部 URL（`coverAssetId`/`cover` 二选一，同切片 2 文章封面语义）。
export const musicCreateInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  artist: z.string().trim().max(200).optional(),
  album: z.string().trim().max(200).optional(),
  sourceAssetId: z.number().int().positive(),             // 受管音源（MUSIC_SOURCE），必填
  coverAssetId: z.number().int().positive().optional(),   // 受管封面（MUSIC_COVER）
  cover: z.url().optional(),                              // 外部封面 URL；与 coverAssetId 互斥归一
}).strict();
export type MusicCreateInput = z.infer<typeof musicCreateInputSchema>;
export const musicUpdateInputSchema = musicCreateInputSchema.partial();
export type MusicUpdateInput = z.infer<typeof musicUpdateInputSchema>;

// 解析端点
export const musicParseInputSchema = z.object({
  sourceAssetId: z.number().int().positive(),
}).strict();
export const musicParseDataSchema = z.object({
  title: z.string().min(1),
  artist: z.string(),
  album: z.string(),
  seconds: z.number().int().min(0),
  src: z.url(),
  sourceAssetId: z.number().int().positive(),
  cover: z.url().nullable(),
  coverAssetId: z.number().int().positive().nullable(),
}).strict();
export const musicParseResponseSchema = apiSuccessSchema(musicParseDataSchema);

// 公开读 —— 同 Track 形状
export const musicPublicListDataSchema = z.object({ items: z.array(musicTrackSchema), total, page, pageSize }).strict();
export const musicPublicListResponseSchema = apiSuccessSchema(musicPublicListDataSchema);
export const musicPublicDetailResponseSchema = apiSuccessSchema(musicTrackSchema);
```

要实现的 DTO 均需显式写出字段（沿用文章/资产的真 schema 风格，不用 `total/page/pageSize` 占位符）。

**错误码**：无新增。复用 `VALIDATION_FAILED`（`fields.exception` 指资产未通过校验）、`NOT_FOUND`、`INTERNAL_ERROR`、`ASSET_REFERENCED`（资产侧阻塞，已存在）。`assertSourceAsset`/`assertCoverAsset` 失败走 `VALIDATION_FAILED`（存在但非 AVAILABLE / mediaType 不符 / purpose 不符 / URL 与 deliveryUrl 不符）。

## 六、apps/api 变更

### 6.1 适配器与资产用例小改（复用，不建第二套）

- `apps/api/src/adapters/object-storage/r2.ts`：`ObjectStorage` 接口增加
  `getObject(key: string): Promise<Uint8Array>`；`R2ObjectStorage` 经 `GetObjectCommand` 实现，Body 转 `Uint8Array`。
- `apps/api/src/modules/assets/service.ts`：把 `upload` 里「校验后已知 buffer/mime → key 命名 → putObject → prisma.asset.create → 孤儿补偿」的尾段抽取为共享私有 `persistBuffer(createdById, purpose, buffer, contentType, ext)`；对外新增
  `createFromBuffer(purpose, buffer, contentType, createdById)`（供音乐模块封面提取调用；内部复跑 `purposeProfiles` 校验、媒体元数据抽取（IMAGE→sharp、AUDIO→`readAudioDuration`）与单写入路径）。**对象写入、key、补偿不泄露到音乐模块。**

### 6.2 新增 `modules/music/`（contracts / service / routes）

**路由表**

| 公开（匿名，挂 `/public/music`）| 管理（ADMIN，挂 `/music`）|
| --- | --- |
| `GET /`（Track 列表，分页，createdAt desc）| `POST /parse`（解析音频资产 → 预填）|
| `GET /:id`（单条 Track）| `POST /`（创建）|
| | `GET /`（管理列表：+search + inActivity + 资产摘要）|
| | `GET /:id`（全量含资产摘要）|
| | `PATCH /:id`（元数据/资产归一编辑）|
| | `DELETE /:id`（删记录，不动资产）|

**service 要点（沿用 `ArticleService` 的 `$transaction` + `ApiError` 风格）**

- `parse(principal, sourceAssetId)`：加载资产（不存在/非 `AVAILABLE`/`mediaType≠AUDIO`/purpose≠MUSIC_SOURCE → `VALIDATION_FAILED`）；`objectStorage.getObject(storageKey)` → `parseBuffer`（复用切片 1 已入服务端依赖 `music-metadata`）→ 取 `common.title/artist/album` + `format.duration`；若 `common.picture[0]` 存在 → `assets.createFromBuffer('MUSIC_COVER', picture bytes, picture.format, principal.userId)` → `coverAssetId`；返回 `MusicParseData`。解析失败（无 common/无法解析）→ **降级而不阻断**：title 从 storageKey 文件名近似（去目录前缀去扩展名）、artist/album 空串、cover null，前端据此提示「请手动补全 + 上传封面」继续流程。
- `create(principal, input)`（事务）：`title` 非空；音源固定走 `sourceAssetId`（必填）——校验存在/`AVAILABLE`/`mediaType=AUDIO`/purpose=MUSIC_SOURCE → `src=deliveryUrl`（复刻切片 2 `resolveCover` 的 URL 拼接）。封面归一：`coverAssetId` → 校验 IMAGE/MUSIC_COVER + `cover=deliveryUrl`；仅外部 `cover` → `coverAssetId=null`。**封面必填**（schema `cover String NOT NULL`）：`coverAssetId` 与 `cover` 皆空 → `VALIDATION_FAILED`(`fields.cover`)。`seconds` 服务端权威：优先 `sourceAsset.durationMs`（MUSIC_SOURCE 上传即由 `readAudioDuration` 提取）；缺失则 `getObject`+`parseBuffer` 重算；两者皆失败 → `VALIDATION_FAILED`(`fields.sourceAssetId`)，提示改用可解析音频。`activityId` 不参与写入。返回 `MusicAdmin`。
- `list(query)`：`where` = title/artist/album 任一 `contains`（`mode: 'insensitive'`）；排序 `createdAt desc, id desc`；分页；select 含 `sourceAsset`/`coverAsset`（storageKey）+ `activityId`；DTO 派生 `inActivity`。
- `detail(id)`：同上 select，单条；`NOT_FOUND`。
- `update(id, input)`（事务）：同类归一；更换 `sourceAssetId` 时重算 `seconds`；不动资产、不动 `activityId`。
- `remove(id)`：`prisma.music.delete`（级联无——仅删记录；被删 Music 解除对资产引用，资产停留 AVAILABLE 供资产库治理或复用）。

### 6.3 挂载

- `apps/api/src/app.ts`：`app.route('/music', createMusicRoutes(dependencies))`、`app.route('/public/music', createMusicPublicRoutes(dependencies))`（CORS 方法已有 GET/POST/PATCH/DELETE，无需扩展）。
- `apps/api/src/bootstrap/dependencies.ts`：`MusicService`（构造注入 prisma/environment/objectStorage/assets）加入 `AppDependencies`。

## 七、apps/admin 变更

### 7.1 依赖准入（阶段 0 验证）

- 本切片阶段 0 **零新增运行时依赖**；移动「正在播放」用既有 `react-modal-sheet`（`BottomSheet` 已封装）；图标用既有 `lucide-react`。无 music-metadata-browser。
- 「不引入状态库」已随状态层迁移推翻：播放器 store 现为 zustand 全局单例（重渲染隔离见 `2026-08-04-admin-zustand-store-refactor.md`）。

### 7.2 路由（`apps/admin/src/routes/route-tree.tsx`）

- `/music`（库页）、`/music/upload`（上传向导）、`/music/:musicId`（详情/查看信息）。
- Shell 导航（`apps/admin/src/app/shell/console-shell.tsx`）：桌面 rail 增「音乐库」分组入口；移动 tab 增「音乐」（lucide `Music2`/`Library`）。

### 7.3 `app/api/music.ts` + `ApiClient`

`createMusicApi(http)`：`list`/`detail`/`parse`/`create`/`update`/`remove`（沿用 `createAssetsApi` 的 schema + authenticated 封装；`parse` 走 `http.post` json）。`ApiClient` 增加 `readonly music`。

### 7.4 `features/music/`

- `display.ts` — `formatDuration(seconds)`（mm:ss）、资产状态文案（镜像 `features/assets/display.ts` 的组织风格）。
- `music-card.tsx` — 封面（`AssetImage`，无封面占位 `disc-3`）、标题/艺术家/专辑/时长、`inActivity` 角标、播放/暂停态、编辑/删除操作。
- `list-page.tsx` — 网格（对齐 `GRID_CLASS` 视觉）、`SearchInput` 搜索、分页、空态/骨架/失败重试；点卡片播放 → 将当前筛选结果集作为播放列表入队（`player.play(items, index)`）。
- `edit-dialog.tsx` — 元数据表单（`TextField` title/artist/album，时长只读显示）+ 封面资产选择（`AssetPickerDialog`，purpose=MUSIC_COVER）+ 音源显示；桌面 `AppDialog`，移动可落 `BottomSheet`；保存调 `music.update`。
- `detail-page.tsx` — 「查看信息」：元数据、`createdAt`、音源/封面资产摘要（`MetaLine` + 跳 `/assets/:id`）、被动态引用状态（`inActivity`）、编辑/删除操作（`ConfirmDialog`）。
- `upload-page.tsx` + `upload-wizard.tsx` — 流程：
  1. 选择/拖入音频文件（`accept=audio/*`）→ `createAssetsApi.upload({ file, purpose:'MUSIC_SOURCE' }, onUploadProgress)` 显示 XHR 进度（镜像资产上传对话框）。
  2. 成功 → `music.parse({ sourceAssetId })` 自动解析 → 表单预填 title/artist/album/seconds + 内嵌封面（coverAssetId 已由服务端落地）。
  3. 解析降级（无元数据/无内嵌封面）→ title=文件名、封面「请上传封面」提示（`Alert`）。
  4. 「更换封面」→ `AssetPickerDialog`（MUSIC_COVER，可在此对话框内直接上传）；封面必填才可提交。
  5. 保存 → `music.create` → 成功 toast + 跳 `/music`（对齐旧项目延迟跳转语义，改为即时跳转）。
  - 375px 单列可完整走通；「提交中」禁用按钮防重复。

### 7.5 全局播放器（`features/music/player/`）

- `store/player.ts` — 播放器 store 为 zustand 全局单例（见 `2026-08-04-admin-zustand-store-refactor.md`）：单例 `AudioElement`、`currentTrack/status(idle|loading|playing|paused|error)/currentTime/duration/volume/muted/playlist/currentIndex/loopMode/shuffleHistory` + 方法 `play(tracks, index)/playById/toggle/pause/seek/next/prev/stop/setVolume/toggleMute/cycleLoopMode/removeTrack`。Media Session（metadata + `setPositionState` + play/pause/previoustrack/nexttrack/seekto 处理器）逐字保留；音量持久化 localStorage；`hasPrev/hasNext/progress` 为消费方选择器派生，`currentTime/duration` 由 `SeekRow` 独占订阅（高频 tick 隔离）。
- `player-bar.tsx` — 桌面 docked 条（`hidden lg:flex`）：封面 40px、标题/艺术家、上一首/播放暂停/下一首、可拖拽 seek（`Slider`）、时间、音量+静音、循环（off/all/one/shuffle 图标切换）；`currentTrack !== null` 时渲染。
- `mini-player.tsx` — 移动悬浮 card（`lg:hidden`，`fixed` 置于底部 tab 之上）：封面缩略、标题、播放暂停、下一首；点按展开全屏面板。
- `now-playing-sheet.tsx` — 移动全屏「正在播放」（`BottomSheet`）：大封面、title/artist/album、seek + 时间、prev/play/next、音量、循环、关闭。
- 挂载：`ConsoleShell`（rootRoute 组件）内渲染（桌面 docked 条 / 移动 mini + sheet），随 root 持久，**跨路由播放不中断**。
- 边界：删除当前曲目 → `removeTrack` 从队列移除并 skip/停止（队列空 → stop→idle）；编辑当前曲目 → 播放器元数据取 store 快照，下次入队刷新。

### 7.6 设计语言校验

新 UI 全部复用 `@/ui/index.js` 既有原语（`PageHeader/PageBody/Panel/MetaLine/RowStack/EmptyState/Skeleton/StatusReadout/AppDialog/ConfirmDialog/BottomSheet/TextField/SearchInput/FilterChip/AssetImage` 等）；不引入新主题变量、不新造圆角/描边/投影风格；移动端沿用「悬浮元素 + BottomSheet」范式（与本仓移动 FAB/底部 tab 一致）。

## 八、apps/main（边界声明：本切片零改动）

- 现状：主站唯一读音乐的地方是 activity 序列化（`apps/main/server/utils/prismaShortcut.ts` 的 `activityMusicSelect = { id,title,artist,album,src,seconds,cover }` → `activity-serializer.ts`），该形态与本切片 `musicTrackSchema` **一字不差**。
- 本切片不迁移主站代码：活动读路径属切片 4（动态发布）资源，届时把 `activityMusicSelect` 换成 API `/public/music` 读取即可，采无形状漂移。
- `apps/main/server/utils/prisma.ts` 暂保留（评论/动态/用户等后续切片仍用）。

## 九、验收与证据（按切片文档 §每切片的交付闭环）

人工验收矩阵至少覆盖：

1. 静态门禁：`pnpm typecheck`、`pnpm lint`、`pnpm fmt:check`、`pnpm build`（全 workspace）绿。
2. 迁移：SQL 仅一条 `ADD COLUMN createdAt`；`pnpm prisma:generate` 后 schema 一致。
3. API 管理接口（本地 dev：
   - 上传 `POST /assets/upload`（MUSIC_SOURCE 真 MP3/FLAC）→ `POST /music/parse`：title/artist/album/seconds/内嵌封面自动填充，且封面已作为 AVAILABLE MUSIC_COVER 资产入库；无标签音频 → 降级文件名标题 + `cover:null`。
   - `POST /music`：校验 asset 存在/AVAILABLE/媒体类型/purpose；`seconds` 取 `durationMs`；封面必填（皆空 → `VALIDATION_FAILED` fields.cover）；`src`/`cover` 与 assetId 归一正确。
   - `GET /music`：search 命中文/英 title/artist/album；分页；createdAt desc + id desc 确定性；`inActivity` 正确。
   - `PATCH /music/:id`：改元数据、换资产归一、换音源重算 seconds。
   - `DELETE /music/:id`：记录删除，资产保留 AVAILABLE。
   - 权限：普通 USER token → `403 AUTH_FORBIDDEN`；不存在 id → `404 NOT_FOUND`。
4. 资产边界：被 Music 引用（`musicSources`/`musicCovers` > 0）的资产置 `PENDING_CLEANUP` → `409 ASSET_REFERENCED`；删 Music 后再置可成功。
5. 公开读：`GET /public/music` list/`:id` 与 `Track` 形状一致（与 `activityMusicSelect` 逐字段比对）。
6. Admin 浏览器（headless Chromium，1440×900 与 375×780）：
   - 库页：网格渲染、搜索、分页、空态、加载；点卡片 → 播放器出现并常驻跨路由。
   - 上传向导：选文件 → 进度 → 自动解析预填 → 换封面 → 保存 → 跳回库页并可播放。
   - 详情页：元数据/资产跳转/被引用态；编辑与删除（confirm）。
   - 播放器：seek/volume/mute/循环四态/上一首下一首/Media Session 系统控制；**删除当前曲目** → skip 或 idle；**编辑当前曲目** → 播放不中断。
   - 移动：mini-player 悬浮于底部 tab 之上、不遮挡 tab；全屏「正在播放」可操作；375px 上传向导完整走通。
7. 主站：无变更；`activityMusicSelect` 与本切片 DTO 逐字段一致（交接证据）。

## 十、实施任务拆分（按序，均待授权）

0. **阶段 0 验证**：`music-metadata` 服务端 `parseBuffer` 的 `common{title,artist,album,picture}` 在 Node 端对本仓语料（实测若干 MP3）的提取正确性；`GetObjectCommand` Body→Uint8Array 转码可用；`AssetService.persistBuffer` 抽取不改变既有 upload 行为（回归）。
1. contracts：`music.ts` DTO + `index.ts` 再导出；`errors.ts` 无需改。
2. 迁移：`Music.createdAt`；`pnpm prisma:generate`。
3. api：ObjectStorage.getObject + AssetService 单写入重构 + `modules/music/`（管理/公开）+ `app.ts`/`dependencies.ts` 挂载。
4. admin：`app/api/music.ts` + ApiClient；`features/music/`（库页/卡片/编辑/详情/上传向导）+ `player/`（store/bar/mini/sheet）+ shell 挂载与导航 + route-tree。
5. 验收：§九全矩阵人工验收 + 证据附录（追加到本文 §十三）。

## 十一、风险与已记录的后顾

- **`getObject` 新增适配器能力**：仅 `music/metrics` 解析使用；读回字节为一次性消耗，不缓存。R2 读后写强一致，无陈旧读风险。
- **封面内嵌提取的服务端写路径**：依赖 `AssetService` 单写入重构，重构必须保持 `upload` 出口行为不变（阶段 0 回归）；否则回退为在音乐模块内直接持有 ObjectStorage（弃单一写入原则的备选，不选）。
- **存量行 createdAt 同值**：迁移时为同一时刻，排序用 `id DESC` 兜底确定性；不向存量回填历史时间。
- **音源强制受管**：外部音源 URL 绕过资产用例（设计文档「不得以浏览器直连或临时 URL 绕过 API」），本切片 `create`/`update` 只接受 `sourceAssetId`，`seconds` 由此服务端推导；若未来确需解析不可行的外部音源，需另授权并显式提供 seconds。
- **无自动化测试框架**（设计定案）：播放器时间相关路径（seek/ended/循环）依赖 §九.6 人工矩阵与证据记录。
- **`activityId` 只读**：切片 4 会放开写权限并新增「动态内选音乐」UI；本切片契约预留 `activityId`/`inActivity` 字段，写接口届时扩展，不破坏本切片 DTO。

## 十二、切片 3 → 切片 4 交接

- `activityMusicSelect` 换源：activity 序列化时经 `GET /public/music/:id`（或多条）取 `Track`；删除 `prismaShortcut.ts` 的 `activityMusicSelect` 与 `activity-serializer.ts` 的 Prisma 直读。
- `Music.activityId` 写入放开：随切片 4「动态内选音乐」一并加 `activityId` 到写 DTO 与校验（活动存在性）。

## 十三、实施记录与验收证据（实施会话后填写）

> 实施会话：2026-08-04。以下按 §九 验收矩阵逐项记录证据。

### 阶段 0 验证

- **`parseBuffer` 提取**：用 ffmpeg 生成带 ID3 标签 + 内嵌 PNG 封面的测试 MP3，`music-metadata@11.14.0` `parseBuffer` 实测命中 `common.title`（“Test Track”）/`artist`/`album`、`format.duration`（3.03s → round 3）、`common.picture[0]`（`format=image/png`、`data` 为 `Uint8Array`）。
- **`GetObjectCommand Body → Uint8Array`**：`transformToByteArray` 位于 `@smithy/core` 的 sdk-stream-mixin，S3 GetObject Body 直接可用；写入 `R2ObjectStorage.getObject`。
- **`AssetService.persistBuffer` 回归**：`upload` 出口行为不变（真实上传验证见下），单写入路径只内聚不改造。

### 1/2/3 静态门禁、迁移（§九 1–2）

- `pnpm typecheck` / `pnpm lint` / `pnpm fmt:check` / `pnpm build` 全 workspace 绿（exit 0）。
- 迁移 `20260803173737_add_music_created_at`：SQL 仅单条 `ALTER TABLE "Music" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;`；一次性临时库 `greyflowers_music_migrate` 生成并审查后删除；`pnpm prisma:generate` 后 schema 一致；本地开发库 `greyflowers_admin_test` 经 `db push` 同步。本地 `migrate deploy` 因该库历史为 `db push` 初始化（`_prisma_migrations` 不完整）不适用，属既有状态，非本切片引入。

### 4 API 管理接口（§九 3）

本地 dev（真实 R2）实机验证 37/37 通过，覆盖：

- 上传 `MUSIC_SOURCE`（真 MP3）→ `POST /music/parse`：`title/artist/album` 自动填充、`seconds` 服务端推导（`durationMs`=3）、内嵌封面自动提取并已作为 `AVAILABLE MUSIC_COVER` 资产落库（`GET /assets/:id` 确认 purpose/status）。
- 无标签 MP3 → 降级：`title`=storageKey 文件名（UUID 前缀，按 §6.2 设计）、`artist/album` 空串、`cover:null`、`seconds>0`，不阻断流程。
- `POST /music`：音源存在性/媒体类型/purpose 校验；`src`=音源 deliveryUrl、`cover` 与 `coverAssetId` 归一正确；封面皆空 → `400 VALIDATION_FAILED fields.cover`；`coverAssetId` 指向非 MUSIC_COVER 资产 → 400。
- `GET /music`：搜索 title/artist/album 不区分大小写（无命中返回空列表）；排序 `createdAt desc, id desc`；分页；`inActivity=false`、`createdAt` 存在。
- `PATCH /music/:id`：改元数据生效；换 `sourceAssetId` 时 `src`/`seconds` 重算。
- `DELETE /music/:id`：记录删除、音源资产保持 `AVAILABLE`；删后解除引用，资产可置 `PENDING_CLEANUP`。
- 权限：USER 角色 token 访问 `/music`、`/music/parse`、`/assets/upload` → `403 AUTH_FORBIDDEN`；不存在的 id → `404 NOT_FOUND`。

### 5 资产边界（§九 4）

被 Music 引用的音源置 `PENDING_CLEANUP` → `409 ASSET_REFERENCED`（Restrict 语义）；删 Music 后再置成功（200）。

### 6 公开读（§九 5）

`GET /public/music` list 与 `:id` 返回与 `activityMusicSelect`（`apps/main/server/utils/prismaShortcut.ts`）逐字段一致：`{ id, title, artist, album, src, seconds, cover }`，无多余键。已删曲目公开读 404。

### 7 Admin 浏览器验收（headless Chromium，1440×900 与 375×780，§九 6）

- 库页：空态/网格渲染；导航「音乐库」入口（桌面 rail 与移动 tab 均出现）。
- 上传向导：选择文件 → XHR 进度 → 自动解析预填（title/artist/album/内嵌封面预览）→ 保存 → 跳回库页并可播放；无标签音频降级 Alert + 封面必填禁用保存；封面选择器内直传 MUSIC_COVER 后保存解锁；375px 单列完整走通。
- 播放器（桌面 docked 条）：播放中、Media Session 元数据正确；跨路由（客户端导航至 /articles/new）持续播放；seek 点击轨道 50% → 1.5s / 3s 生效；音量滑块 + 静音切换正常（音量 0.5 刷新后持久化，localStorage）；循环四态（off→all→one→shuffle）循环切换。
- 编辑：对话框字段预填，改标题保存后网格与 API 同步；播放器元数据保留编辑前快照（设计指定“下次入队刷新”）。
- 删除：`ConfirmDialog` 披露孤儿提示；确认后空态恢复；被删曲目正播放时播放器回 `idle`（队列空 → stop）。
- 详情页：元数据/时长/上传时间、音源与封面资产摘要（跳转 `/assets/:id` 正常，资产详情页含音频播放条）、「未进入动态」状态、编辑/删除操作。
- 移动端：mini 悬浮卡（`left-3 right-20`）悬于底部 tab 之上 15px、与右上 FAB 无重叠；点按展开全屏「正在播放」（大封面 + seek + prev/play/next + 音量 + 循环）。

### 8 主站（§九 7）

`apps/main` 零代码改动；`activityMusicSelect` 与本切片 `musicTrackSchema` 逐字段一致（交接证据成立）。

### 实施备注（偏差/后顾）

- 播放器为一页内内存态：硬刷新（整页 reload）会重置播放器，属预期（模块级单例，非持久化）；客户端路由导航下跨页持续。
- 无标签降级标题来自 storageKey 文件名（UUID），按 §6.2 设计定案；若需展示原文件名需在切片 4 或后续授权中扩展输入。
- `EditMusicDialog`/上传向导封面在选了受管封面时以服务端归一为准（与文章封面语义一致）。
- 测试期间在本地库/真实 R2 产生的数据与临时用户已于验收后全部清理（Music、music-* 资产行归零，R2 对象经 API 删除）。
