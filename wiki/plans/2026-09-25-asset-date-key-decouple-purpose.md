# 资产上传去用途化：`assets/{YYYY}/{MM}/` 日期目录 + mediaType 校验

## 状态与用途

- 决策日期：2026-09-25
- 状态：方向已与维护者对齐（key 形态定为 `assets/{YYYY}/{MM}/{uuid}.{ext}`），计划待实施
- 文档类型：实施计划（含破坏性契约变更的 expand → migrate → contract 排序）
- 读者：本计划的 API、contracts、Admin 实施者与部署维护者
- 推翻记录：`wiki/plans/2026-08-02-managed-assets-slice.md` 决策表中「purpose 目录（六个消费 role 即目录）」与「否决通用资产库目录」两行。原「否决」理由（消费时被迫 re-key）在实现中从未发生：消费全部走 assetId 引用，delivery URL 由 storageKey 推导，对象从不搬家。「storage key 永不 re-key」不变量本计划延续。

## Agreed outcome

- **Goal**：上传资产不再要求申报用途；storage key 统一为 `assets/{YYYY}/{MM}/{uuid}.{ext}`；上传校验与选择器过滤按 mediaType（IMAGE/AUDIO）进行；purpose 从契约、API、admin 全部移除；跨角色复用真正成立（任一图片资产可用于任何封面/插图/动态/音乐封面场景）。
- **Constraints and invariants**：
  - 无数据库迁移、无 Prisma schema 变更（`Asset` 表不加 purpose 列，延续「无迁移」决策）。
  - 存量对象与存量 storageKey 一律不动：不 re-key、不搬 R2 对象、delivery URL 不变。
  - 上传协议保持 presign 三步（upload-url → 浏览器 PUT → confirm），密钥不出服务端。
  - 受管门禁保留：confirm 只接受受管 key 形态；错误码语义不变。
  - 上限与 MIME 白名单 SSOT 仍在 contracts；admin 客户端预检与服务端共用。
  - 部署顺序强制：expand 的 API 先行 → migrate 的 admin 第二 → contract 的 API 收尾；expand 后老 admin 必须完全可用。
- **Non-goals**：图片/音频处理管线（压缩/裁剪/转码）；DB purpose 列或可编辑用途标签；R2 lifecycle 规则；`apps/main` 改动；上传协议重构；资产库新增筛选能力（仅替换现有用途筛选为既有 mediaType 筛选）。

## Current-state evidence

- 上传入口强制申报用途：`packages/contracts/src/assets.ts:169-177`（`assetUploadUrlInputSchema` 含必填 `purpose` 且 `.strict()`）；admin 弹窗六选一：`apps/admin/src/features/assets/upload-dialog.tsx:42,125-148`。
- key 由用途目录 + 月份段构成：`apps/api/src/modules/assets/service.ts:90`（`${assetPurposeDirectory[purpose]}/${currentMonthPrefix()}/${randomUUID()}.${ext}`）。
- purpose 不落库、由 key 首段反推 + mediaType 兜底：`apps/api/src/modules/assets/contracts.ts:14-47,90`；`packages/db/prisma/schema.prisma:178-181`（`storageKey @unique`、`mediaType`，无 purpose 列）。
- 校验档假粒度：`packages/contracts/src/assets.ts:57-88` 六个用途中五个 profile 完全相同（IMAGE ≤20MB、同一 MIME 白名单），仅 MUSIC_SOURCE 不同（AUDIO ≤150MB）。
- 用途即准入门槛（实质耦合）：`apps/api/src/modules/music/service.ts:242-246,264-268` 要求 `assetPurposeFromStorageKey(...) === 'MUSIC_SOURCE' / 'MUSIC_COVER'`；`apps/api/src/modules/activities/service.ts:304-307` 要求 `=== 'ACTIVITY_IMAGE'`。上传时用途选错的资产永远无法被其他角色引用。
- picker 按用途过滤：`apps/admin/src/widgets/asset-picker.tsx:26,57,77,88`；`apps/admin/src/app/server-state/modules/assets.ts:21-27,43-56`。
- purpose 消费点全清单：admin——`app/api/modules/assets.ts:61,73,90`、`features/assets/{display.ts:9-21, list-page.tsx:29,77,134,162,189-199, detail-page.tsx:24,194,218,253, upload-dialog.tsx, search.ts:6-14, search.test.ts}`、`lib/upload-limits.ts:1-23`、picker 调用点（`features/activities/compose-page.tsx:111,498`、`features/articles/editor/code-mirror-pane.tsx:122,304`、`inspector-pane.tsx:434`、`features/music/edit-dialog.tsx:199`、`upload-wizard.tsx:197,214`、`features/taxonomy/categories-page.tsx:348`）；api——`modules/assets/{contracts.ts,service.ts:79,90,116-123,186-188}`、music、activities；contracts——`assets.ts`；`apps/main` 无任何引用；`packages/db` 仅 `scripts/seed.mts:130-222` 用六前缀造 key。
- overview 存储统计按 mediaType 分桶，不依赖 purpose：`packages/contracts/src/overview.ts:106-113`、`apps/api/src/modules/overview/contracts.ts:86-96`。
- 文章正文引用校验不看 purpose（AVAILABLE + delivery URL 精确匹配）：`apps/api/src/modules/articles/service.ts:154-190`。
- R2 adapter 纯 I/O、与 key 语义无关：`apps/api/src/adapters/object-storage/r2.ts:21-46`。
- 部署三应用独立（api 走 PM2 换目录，admin 静态 rsync）：`agent-docs/BUILD.md` 部署节；`deploy-{api,admin,main}.yml` 均带 gate（fmt/lint/typecheck/test）。
- 回归门槛命令存在且被 CI 使用：`agent-docs/TESTING.md`（`pnpm test && pnpm typecheck && pnpm lint && pnpm build`，admin/api 各有 vitest）。
- 既有纯函数测试惯例（新 helper 可测）：`apps/api/src/lib/*.test.ts`、`apps/admin/src/features/assets/search.test.ts`。

## Incremental implementation

### Slice 1 — API expand：日期 key + mediaType 校验，老 admin 完全可用

- **Outcome**：新上传一律落 `assets/{YYYY}/{MM}/{uuid}.{ext}`；校验按 mediaType；音乐封面/音源、动态图片的用途准入降级为 mediaType 准入（跨角色复用生效）；老 admin（仍发 purpose、仍按 purpose 过滤 picker）无破坏。
- **Scope**：`packages/contracts/src/assets.ts`；`apps/api/src/modules/assets/{service.ts,contracts.ts}`；`(new) apps/api/src/modules/assets/managed-key.ts`；`(new) apps/api/src/modules/assets/media-type.ts` + `managed-key.test.ts` / `media-type.test.ts`；`apps/api/src/modules/music/service.ts`；`apps/api/src/modules/activities/service.ts`。
- **Changes**：
  1. contracts：新增 `assetMediaTypeProfiles: Record<AssetMediaType, AssetUploadProfile>`（IMAGE/AUDIO，复用 `ASSET_IMAGE_MAX_BYTES` / `ASSET_AUDIO_MAX_BYTES` 与两份 MIME 白名单常量）；`assetUploadUrlInputSchema.purpose` 改 `.optional()`（老 admin 仍发送）；`assetDtoSchema.purpose` 改 optional（本切片 API 仍恒发送）。`assetUploadProfiles` 原样保留（老 admin 客户端预检在用）。
  2. 新增 `managed-key.ts`：`buildManagedAssetKey(now: Date, id: string, ext: string): string` → `assets/${YYYY}/${MM}/${id}.${ext}`；`isManagedAssetKey(key: string): boolean`——四段形态校验（首段 `assets`、次段 `^\d{4}$`、三段 `^\d{2}$`、末段含扩展名），天然拒绝 `assets/2026/09/../x.png` 与越段 key。
  3. 新增 `media-type.ts`：`mediaTypeOfMime(mime: string): AssetMediaType | undefined`，基于 contracts 两份 MIME 白名单。
  4. `createUploadUrl`：忽略 `input.purpose`；`mediaTypeOfMime(declared)` 未命中 → `UNSUPPORTED_MEDIA_TYPE`；profile 取 `assetMediaTypeProfiles`；size 预检逻辑同今；key 用 `buildManagedAssetKey`。
  5. `confirmUpload`：key 门禁 = `isManagedAssetKey(key)` **或** 遗留六前缀（`assetPurposeFromDirectory` 命中，容忍 PM2 换服瞬间在途的老 presign）；mediaType 一律由 `normalizeDeclaredMime(head.contentType)` 推导，未命中 → `UNSUPPORTED_MEDIA_TYPE`；profile 按来源选（日期 key → mediaTypeProfiles，遗留 key → 旧 purpose profile）；`width/height` 仅 IMAGE、`durationMs` 仅 AUDIO（与现状一致）。
  6. `toAssetDto` 的 purpose 推导不变：日期 key 落 mediaType 兜底标签（AUDIO→MUSIC_SOURCE、IMAGE→ARTICLE_COVER），过渡期外观瑕疵，见风险节。
  7. `music/service.ts` 两处、`activities/service.ts` 一处：删除 `assetPurposeFromStorageKey(...) === 'X'` 判据，仅保留 mediaType 判据。
- **Preserved behavior**：presign 三步协议与全部错误码（`UNSUPPORTED_MEDIA_TYPE` / `ASSET_PAYLOAD_TOO_LARGE` / `UPLOAD_FAILED` / `VALIDATION_FAILED`）、响应信封、鉴权（ADMIN）、孤儿补偿删除；存量资产行与 delivery URL；list 的 `purpose` 过滤参数（老 admin 在用）。
- **Dependencies**：无（仅既有能力）。
- **Verification**：
  - `pnpm -F @grey-flowers/api exec vitest run src/modules/assets`（新增用例：`buildManagedAssetKey` 日期形态；`isManagedAssetKey` 对 `wiki/x.png`、`assets/foo/bar.png`、`assets/2026/09/../x.png`、缺扩展名全部拒绝；`mediaTypeOfMime` 命中两表、未知 mime 返回 undefined）。
  - `pnpm typecheck && pnpm lint && pnpm fmt:check && pnpm build`（跨工作区编译）。
  - 手动冒烟（需 R2 + DB，按 TESTING.md「API change」）：`pnpm dev:api` 后 ① 不带 `purpose` POST `/assets/upload-url`（contentType `image/jpeg`）→ 200，key 形如 `assets/2026/09/<uuid>.jpg`；② 带 `purpose: 'ARTICLE_COVER'` → 仍 200（老 admin 兼容）；③ 伪造 confirm key `wiki/x.png` → `VALIDATION_FAILED`。
- **Done when**：以上命令与冒烟全绿；老 admin 的上传/挑选/引用流程在 expand API 上无 4xx。

### Slice 2 — Admin migrate：上传零用途申报，picker/列表按 mediaType

- **Outcome**：「上传资产」弹窗不再有用途选择（选文件/粘贴 → 上传）；六个选择器与资产库列表按 mediaType 过滤；资产库筛选去掉「用途」；任意已上传图片资产可被任何封面/插图/动态/音乐封面场景选用。
- **Scope**：`apps/admin/src/app/api/modules/assets.ts`；`apps/admin/src/app/server-state/modules/assets.ts`(+`assets.test.ts`)；`apps/admin/src/features/assets/{upload-dialog,list-page,detail-page,display,search(+search.test.ts)}`；`apps/admin/src/lib/upload-limits.ts`；`apps/admin/src/lib/media-accept.ts`(+test 如有)；`apps/admin/src/widgets/asset-picker.tsx`；picker 调用点：`features/activities/compose-page.tsx`、`features/articles/editor/{code-mirror-pane,inspector-pane}.tsx`、`features/music/{edit-dialog,upload-wizard}.tsx`、`features/taxonomy/categories-page.tsx`。
- **Changes**：
  1. `upload(input: { file })`：删除 purpose；`MUSIC_SOURCE` 特判改为按 `contentTypeOf(file)` 前缀 `audio/` 跳过 `readImageSize`。
  2. `upload-limits.ts`：`uploadSizeError(file, mediaType)`、`maxUploadMb(mediaType)`，数据源改 `assetMediaTypeProfiles`；picker/弹窗调用点同步。
  3. `asset-picker.tsx`：prop `purpose: AssetPurpose` → `mediaType: AssetMediaType`；`assetsPickerOptions(mediaType, session)` 与 query key 同步；上传预检按 mediaType。
  4. picker 调用点映射：文章封面/正文插图/分类封面/动态图片/音乐封面 → `'IMAGE'`；音乐音源无 picker（向导直传，仅去掉 `purpose: 'MUSIC_SOURCE'`）。
  5. `upload-dialog.tsx`：删除六按钮 RadioGroup 与「先选择上传用途」门禁；accept 用图片+音频并集（`media-accept.ts` 新增 `ANY_ACCEPT_MAP`）；尺寸预检 `uploadSizeError(file, mediaTypeByFile)`；成功 toast 按文件 MIME 分「图片已上传/音频已上传」。
  6. `list-page.tsx` + `search.ts`(+test)：删除 purpose 筛选 SelectField 与 URL 参数；卡片用途徽章改 mediaType 徽章（`mediaTypeLabels` 已存在）。
  7. `detail-page.tsx`：删除「用途」行与 `purposeLabels` 标题/alt，用 mediaType 标签。
  8. `display.ts`：删除 `purposeLabels` / `purposeOptions`；`assets.test.ts` fixture 去掉 purpose（DTO schema 已 optional）。
- **Preserved behavior**：分页与失效编排（`assetsRoot` + overview counts）、上传进度/取消/会话语义、错误文案映射、粘贴上传（`use-paste-files`）。
- **Dependencies**：Slice 1 已实现并部署（API 接受无 purpose 上传；attach 已放宽，「跨角色挑选」可在本切片冒烟中验证）。
- **Verification**：
  - `pnpm test`（admin 全套，含改动的 `search.test.ts`、`assets.test.ts`）、`pnpm typecheck && pnpm lint && pnpm fmt:check`。
  - grep 门禁：`rg -n "AssetPurpose|purpose" apps/admin/src` 零命中。
  - 手动冒烟 `pnpm dev:admin`（连 expand API）：资产库上传图片+音频（无用途选择）、粘贴上传、编辑器内联插入与正文图片 picker、文章/分类封面 picker、动态图片多选、音乐向导音源直传+封面 picker、以及「用一篇老文章封面上传过的图当音乐封面」成功。
- **Done when**：门槛全绿 + 冒烟清单逐项通过 + grep 门禁为零。

### Slice 3 — Contract：契约与 API 移除 purpose 全部痕迹

- **Outcome**：契约面不再存在 `AssetPurpose` / `assetUploadProfiles` / 任何 purpose 字段；遗留前缀确认分支删除；seed 与 agent-docs 与实现一致。
- **Scope**：`packages/contracts/src/assets.ts`；`apps/api/src/modules/assets/{service.ts,contracts.ts}`；`packages/db/scripts/seed.mts`；`agent-docs/BUILD.md`、`agent-docs/API_CONVENTIONS.md`。
- **Changes**：
  1. contracts：删除 `assetPurposeSchema` / `AssetPurpose` / `assetUploadProfiles`；`assetUploadUrlInputSchema` 删除 purpose 字段（此后老 admin 发 purpose → 400，即迁移完成的技术门禁）；`assetListQuerySchema`、`assetDtoSchema` 删除 purpose。
  2. `api/modules/assets/contracts.ts`：删除 `assetPurposeDirectory` / `directoryAssetPurpose` / `assetPurposeFromStorageKey` / `assetPurposeFromDirectory`；`toAssetDto` 去 purpose；`list` 去 purpose where 分支。
  3. `api/modules/assets/service.ts`：`confirmUpload` 删除遗留六前缀分支（仅 `isManagedAssetKey` 门禁）。
  4. `seed.mts`：`imageAsset` / `audioAsset` 造 key 前缀改为 `assets`（日期段按当前时间现算），对齐生产形态。
  5. 文档：`BUILD.md` 种子描述去「purpose 目录」措辞；`API_CONVENTIONS.md` `/assets` 行改为「presigned PUT 三步上传（无用途字段），mediaType 校验」（顺带修正其过时的「multipart」表述）。
- **Preserved behavior**：其余契约面、资产生命周期、错误码、delivery URL 推导不变。
- **Dependencies**：Slice 1 与 Slice 2 均已实现并部署（admin 已不发/不读 purpose）。
- **Verification**：
  - `pnpm test && pnpm typecheck && pnpm lint && pnpm fmt:check && pnpm build`。
  - grep 门禁：`rg -n "AssetPurpose|assetUploadProfiles|assetPurpose" apps packages` 仅本计划文档命中。
  - 手动冒烟：上传一张图 + 一次「音乐封面 picker 引用既有图片」回归 expand 语义。
- **Done when**：全部门槛绿 + grep 门禁为零 + 冒烟通过。

## Final acceptance criteria

- [ ] 资产库上传无用途选择，直接选文件/粘贴 → 201；R2 key = `assets/{YYYY}/{MM}/{uuid}.{ext}`（详情页 storageKey 可见）。
- [ ] 图片 ≤20MB、音频 ≤150MB；超限在 admin 选入与 API presign/confirm 两端都拒绝（`ASSET_PAYLOAD_TOO_LARGE`）。
- [ ] 六个消费场景（文章封面/正文插图/分类封面/动态图片/音乐封面/音乐音源）均能选用任意 mediaType 匹配的既有资产（跨来源复用成立）。
- [ ] 存量资产（六前缀 key）列表/详情/引用计数/标记/删除全正常，delivery URL 不变；已发布文章封面与 RSS 不受影响。
- [ ] confirm 门禁：非受管 key（`wiki/x.png`、`assets/foo/bar.png`、`assets/2026/09/../x.png`）→ `VALIDATION_FAILED`；未白名单 MIME → `UNSUPPORTED_MEDIA_TYPE`。
- [ ] `pnpm test && pnpm typecheck && pnpm lint && pnpm fmt:check && pnpm build` 全绿；`rg` 门禁无 purpose 残留（本计划文档除外）。

## Risks and controls

- **部署顺序错误（contract API 先于新 admin）→ 老 admin 上传全部 4xx** → Slice 3 的 Done when 含「admin 源码 grep 无 purpose」门禁；计划固定三段发布：API(expand) → Admin(migrate) → API(contract)，不提供混合顺序。
- **过渡窗口老 admin 显示错标签**（日期 key 资产被 mediaType 兜底标为「文章封面」/「音源」）→ 已接受的临时外观问题：上传/引用功能不受影响，老资产标签仍准确；控制：Slice 1 与 Slice 2 连续发布，不长期停留。
- **PM2 换服瞬间在途的老 presign confirm 被拒** → Slice 1 confirm 保留遗留前缀接受分支，Slice 3 才移除（老 presign TTL 600s，窗口足够）。
- **回滚边界**：任一切片可单独回滚到前一 artifact；日期 key 的 R2 对象与 DB 行无 schema 依赖，回滚后仅「新上传落回用途目录 / 新 admin 不可用（需同步回滚 admin）」，无数据损坏；已确认资产在任何版本下列表/引用正常（purpose 推导本就有 mediaType 兜底）。
- **破坏性契约变更** → admin 是唯一消费者且源码同仓；`pnpm build`（contracts → api/admin/main 拓扑）覆盖跨工作区编译；`apps/main` 已确认零引用。

## Deferred scope

- R2 lifecycle/清理规则与图片处理管线：原切片已明确延后，与本计划无耦合。
- 资产库「按引用状态筛选（未被使用）」：有真实价值但超出本次共识，独立评估。
- API service 层单元测试补齐（本次仅为新增纯 helper 配测试，遵循现有测试惯例的最小增量）。
