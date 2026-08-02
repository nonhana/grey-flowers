# Grey Flowers 受管理资产切片专项设计（切片 1）

## 状态与用途

- 决策日期：2026-08-02
- 状态：已确认，可实施（待 Hana 审阅）
- 文档类型：专项设计与实施任务边界
- 读者：本切片的 API、Admin、R2 Adapter 与验收维护者
- 前置约束：
  - [admin-operational-workflow-slices.md](../design/admin-operational-workflow-slices.md) 的切片 1（受管理资产）与横切前置
  - [2026-08-01-asset-schema-foundation.md](../design/2026-08-01-asset-schema-foundation.md) 的建模原则与待决事项
  - [2026-08-01-hono-backend-architecture.md](../design/2026-08-01-hono-backend-architecture.md) 的组合与依赖边界
  - [2026-08-01-react-frontend-architecture.md](../design/2026-08-01-react-frontend-architecture.md) 的 feature 纵切与状态纪律
  - [2026-08-02-grey-flowers-authentication-system.md](./2026-08-02-grey-flowers-authentication-system.md)（已实现）

本文授权：本切片涉及的 contracts 变更、API 模块与 R2 Adapter、Admin 资产库 feature、CORS/环境变量变更。**不涉及新的数据库迁移**（Asset schema 已在 `20260801093420_asset_schema_foundation` 落地）。

## 一、决策记录（本切片定案）

| 决策点             | 决定                                                 | 理由 / 备注                                                                                           |
| ------------------ | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 上传协议           | **API 代理上传**                                     | 浏览器不持 R2 凭证、不能指定 object key；字节确认与持久化同编排；最贴合「API 为唯一业务入口」不变条件 |
| purpose 目录       | **六个消费 role 即目录**（见 §5）                    | 上传即定址，storage key 永不 re-key；资产可跨 role 复用但前缀稳定                                     |
| 通用「资产库」目录 | **否决**                                             | 避免 `library/` 里的资产被消费时被迫 re-key 迁移                                                      |
| 图片/音频处理      | **存原件 + 真实元数据**                              | sharp/metadata 与 music-metadata 只取元数据，不做编码/裁剪；处理策略留待消费切片                      |
| 上传缓存策略       | **v1 内存缓冲 + 硬上限**                             | 图片 ≤20MB、音频 ≤150MB；流式直传作为已记录的后续优化（见 §12）                                       |
| 会话与授权         | 复用现有 `requirePrincipal` + `requireRole('ADMIN')` | 不新建 auth 逻辑                                                                                      |
| Admin 路由库       | **TanStack Router（code-based）**                    | 首个需要 URL 状态的 feature；TS-first、React 19 兼容；不引 DevTools                                   |
| 数据库             | **无迁移**                                           | Asset/关联表/枚举已在 foundation 迁移落地                                                             |
| 错误码             | 新增 4 个枚举，见 §6                                 | 与 contracts 单一来源对齐                                                                             |

**明确不做**：不建第二套上传/认证规则；不做 img 处理管线（尺寸/水印/缩略图）；不为消费切片预建关系写入；不引入队列/定时清理作业。

## 二、运营结果与完成边界

管理员完成结果：**安全地从管理页上传受管理图片/音频，查看资产库，检查引用状态，并在安全条件下标记或删除资产。**

完成边界（闭环）：

1. 会话与授权：仅 `ADMIN` 可访问资产写操作；浏览器不持 R2 凭证。
2. 上传协议：multipart → Hono → R2 Adapter，服务端定 key。
3. 文件校验：per-purpose MIME 白名单 + 命中规格 + 大小上限（Content-Length 预检 + 缓冲后复查）。
4. 对象写入确认：`PutObjectCommand` 成功后才建 `Asset`（`AVAILABLE`）；DB 建行失败 → best-effort 删 R2 对象（孤儿补偿）。
5. 生命周期：`AVAILABLE → PENDING_CLEANUP → DELETED`；标记与删除均要求「零引用」安全条件。
6. 资产库与引用状态：分页列表、详情含六个关系 count。
7. 主站迁移：**当前主站无任何 Asset 消费（判据空置）**，因此本切片不含 main 侧改动；公开投递走 `R2_PUBLIC_URL` 的公开桶，main 的消费读路径归切片 2。

## 三、行为清单（旧 nuxt-admin，采纳/调整/拒绝）

| 旧行为                                                 | 处置       | 结论                                                                                    |
| ------------------------------------------------------ | ---------- | --------------------------------------------------------------------------------------- |
| 通用上传 `POST /api/admin/upload?directory=…`          | 调整       | 定址模式保留；directory 改为六 purpose 常量目录；key 强随机 UUID                        |
| 图片上传 sharp 压缩转 WebP（width/height/fit/quality） | 拒绝（v1） | 处理策略属消费场景；v1 存原件，管线随文章/封面切片引入                                  |
| `Content-Type` 校验、无魔术字节、无大小上限            | 拒绝       | 补命中规格嗅探 + per-purpose 上限                                                       |
| 删除时 `extractR2Key(url)` 从公开 URL 反查 key         | 拒绝       | foundation 明令禁止 URL 反查；改用 Asset.storageKey                                     |
| MusicUploader 浏览器端解析时长/内嵌封面                | 调整       | 时长提取移服务端（music-metadata）写 `Asset.durationMs`；封面上传归 MUSIC_COVER purpose |
| 上传仅返回 `{url, key}`、无记录/生命周期               | 拒绝       | Asset 持久化 + 生命周期 + 引用状态是本切片核心                                          |

## 四、上传协议（API 代理上传）

### 时序

```text
POST /assets/upload   (multipart: file + purpose, Bearer ADMIN)
  1. 预检：Content-Length ≤ purpose 上限；Hono parseBody 取 File
  2. 缓冲到内存（≤上限）；命中规格嗅探首块 + File.type ∈ purpose 白名单
  3. 生成 key：<purposeDir>/<yyyymm>/<randomUUID>.<ext>（ext 由命中规格/MIME 推导）
  4. image 目的 → sharp.metadata(buf) 取 width/height；audio 目的 → music-metadata 取 durationMs
  5. PutObjectCommand(Bucket, Key, Body, ContentType) —— 写失败 → UPLOAD_FAILED，无 DB 痕迹
  6. prisma.asset.create({ AVAILABLE, createdById: principal.userId, byteSize, 元数据 })
  7. create 失败 → best-effort deleteFromR2(key)，返回 UPLOAD_FAILED（孤儿补偿）
  8. 返回 AssetDto（含 deliveryUrl）
```

### 校验档（per purpose）

| purpose                                                                        | mediaType | MIME 白名单                                 | 大小上限              |
| ------------------------------------------------------------------------------ | --------- | ------------------------------------------- | --------------------- |
| ARTICLE_COVER / ARTICLE_INLINE / CATEGORY_COVER / MUSIC_COVER / ACTIVITY_IMAGE | IMAGE     | jpeg, png, gif, webp（拒绝 svg，防 XSS 面） | 20MB                  |
| MUSIC_SOURCE                                                                   | AUDIO     | mpeg, wav, ogg, flac, aac                   | 150MB（草案值，可调） |

命中规格与 `File.type` 不一致 → `UNSUPPORTED_MEDIA_TYPE`。

## 五、Contracts 变更（packages/contracts）

### 新增 `src/assets.ts` 并在 index 导出

```ts
// 枚举（供输入 + DTO）
AssetPurpose = ARTICLE_COVER | ARTICLE_INLINE | CATEGORY_COVER | ACTIVITY_IMAGE | MUSIC_SOURCE | MUSIC_COVER

assetDtoSchema = {
  id, purpose, mediaType, status,
  mimeType, byteSize: number,        // BigInt → number（个人站远低于 MAX_SAFE_INTEGER）
  width?, height?, durationMs?,
  storageKey, deliveryUrl,           // deliveryUrl = R2_PUBLIC_URL 推导，非持久化字段
  createdAt, updatedAt,
}

assetReferenceCountsSchema = {
  articleCovers, articleInlineAssets, categoryCovers,
  musicSources, musicCovers, activityImages, total,
}

// 上传：multipart，输入无 JSON schema（文件校验在服务端）；成功 DTO = assetDtoSchema
// 列表输入（query）：mediaType?, purpose?, status?, page, pageSize
// 列表成功：{ items: assetDtoSchema[], total, page, pageSize }
// 详情成功：{ asset: assetDtoSchema, references: assetReferenceCountsSchema }
// 标记输入：PATCH /assets/:id { status: 'PENDING_CLEANUP' | 'AVAILABLE' }
// 删除：DELETE /assets/:id（无 body）
```

### 错误码扩展（并入 `apiErrorCodeSchema`）

| code                                                                              | HTTP | 语义                              |
| --------------------------------------------------------------------------------- | ---- | --------------------------------- |
| `ASSET_PAYLOAD_TOO_LARGE`                                                         | 413  | 超过 purpose 大小上限             |
| `UNSUPPORTED_MEDIA_TYPE`                                                          | 415  | MIME/命中规格不符                 |
| `UPLOAD_FAILED`                                                                   | 502  | R2 写入或 DB 建行失败（含已补偿） |
| `ASSET_REFERENCED`                                                                | 409  | 标记/删除被引用状态阻止           |
| （复用）NOT_FOUND / AUTH_REQUIRED / AUTH_FORBIDDEN / CONFLICT / VALIDATION_FAILED |      |                                   |

同时扩展 `apps/api/src/http/errors.ts` 的 `errorStatus` / `errorMessages` 两张 map（单一来源，枚举驱动）。

## 六、apps/api 变更

### env.ts

- 新增（dev/prod 均必填）：`R2_ACCOUNT_ID`、`R2_ACCESS_KEY_ID`、`R2_SECRET_ACCESS_KEY`、`R2_BUCKET_NAME`、`R2_PUBLIC_URL: z.url()`。
- 派生注入 `ApiEnvironment`：`R2_ENDPOINT = https://<accountId>.r2.cloudflarestorage.com`、`R2_REGION = 'auto'`；`ASSET_PUBLIC_URL` 即 `R2_PUBLIC_URL`。
- `.env.example` 同步补这 5 行。
- ⚠️ **seam**：现 `.env` 中 `R2_PUBLIC_URL` 值带 `@url:` 前缀，`z.url()` 会校验失败——实施时需 Hana 将该行改为纯 `https://blog-r2.caelum.moe`。

### adapters/object-storage/r2.ts

- 依赖：`@aws-sdk/client-s3`（进 `api` catalog）。
- 窄接口仅封装真实差异：`putObject({ key, body, contentType, size })`、`deleteObject(key)`、`headObject(key)?`。不做载荷/权限/流程解释。
- 组合根 `bootstrap/dependencies.ts` 注入 `objectStorage: R2ObjectStorage`；`AppDependencies` 增加该字段。

### modules/assets/

- `contracts.ts`：本模块私有 DTO→Prisma 映射/投影（查询、serialize 函数）。
- `service.ts`：上传编排（§4 时序）、列表（where + 分页 + 排序）、详情（六个引用 `_count` 查询）、标记/恢复、删除（引用校验 + R2 + row）。
- `routes.ts`：全部经 `requirePrincipal` + `requireRole('ADMIN')`。
  - `POST /assets/upload`
  - `GET /assets`（query 校验）
  - `GET /assets/:id`
  - `PATCH /assets/:id`（status 迁移）
  - `DELETE /assets/:id`
- 路由保持薄：校验 → service → 已映射 DTO；不引入 Prisma 类型出界。

### app.ts

- CORS `allowMethods` 增加 `'DELETE'`（现在只有 GET/POST/PATCH/OPTIONS）。
- 挂载 `app.route('/assets', createAssetRoutes(deps))`。

## 七、apps/admin 变更

### TanStack Router 准入

- `admin` catalog 增 `@tanstack/react-router`（code-based route tree；不引 Vite 插件/DevTools）。
- 集成缝：现有 `providers.tsx` 在 App 层完成 auth 守卫；Router 挂在 **authenticated shell 内**（即 `AdminShell` 认证分支变为路由出口），路由自身不碰认证。
- 初始路由：`/` → 重定向 `/assets`；`/assets`（列表）、`/assets/:id`（详情）。

### features/assets/

- `api.ts`：按「组合根单例 + 一域一工厂」约定新增 `createAssetsApi(http)`；上传走 FormData（现有 `http.ts` 是 JSON 专用，需为 upload 扩展一次 FormData 通道并保持 `retryOnAuthRequired` 语义）。
- 页面（桌面/平板/手机语义一致，只变布局）：
  - 列表：卡片网格 → 窄屏单列；筛选（purpose / mediaType / status）+ 分页；空状态、失败重试、加载骨架。
  - 上传：dialog/底部 sheet；必选 purpose（六选）+ 文件选择 + 进度 + 失败原地重试。
  - 详情：元数据（尺寸/时长/大小/保存时间）、delivery URL 复制、**引用状态六项 count**。
  - 危险操作：`标记清理`（AVAILABLE 且零引用可点）→ 二次确认；`彻底删除`（PENDING_CLEANUP 且零引用）→ 二次确认；`恢复`（PENDING_CLEANUP → AVAILABLE）。
- 最小命中 44px、hover 不唯一入口、键盘可达（React Aria 基线）。

## 八、验收与证据

按切片文档 §每切片的交付闭环：

1. `pnpm typecheck`、`pnpm lint`、`pnpm fmt:check`、`pnpm build` 全绿。
2. 人工验收证据（记录到 wiki/plans 审查记录或本文件附录）：
   - 成功：上传图片/音频 → 列表 → 详情元数据正确 → delivery URL 可公开访问。
   - 权限拒绝：普通 USER token 上传 → `AUTH_FORBIDDEN`。
   - 校验失败：超 size、MIME 白名单外、命中规格与声明不符 → 对应错误码，DB 无孤儿行。
   - 边界：重复上传、并发两个上传互不串 key；`ASSET_REFERENCED` 分支（造一个 `articleCovers` 关系后用普通 DELETE/标记验证 409）。
   - 生命周期：标记 → 恢复；标记 → 删除后 R2 对象 404、行 DELETED/移除。
   - 窄屏：手机上传 sheet、列表单列、危险操作确认可用。
3. 孤儿补偿抽查：人为让 DB 写入失败（临时环境），确认 R2 对象被补偿删除。

## 九、实施任务拆分（按序，均待授权）

1. contracts：`assets.ts` DTO + 4 错误码；`errors.ts` 两张 map 扩展。
2. api env：R2 5 变量 + 派生注入；`.env.example`。`@url:` seam 交 Hana 处理。
3. adapters：`@aws-sdk/client-s3` 依赖 + `r2.ts` + 组合根注入。
4. api module：`modules/assets/`（service/routes）+ app.ts（CORS DELETE、路由挂载）。
5. admin：TanStack Router 准入 + 路由树 + `features/assets/`（api + 列表 + 上传 + 详情 + 危险操作）。
6. 验证：§8 全流程人工验收 + 证据记录。

## 十、风险与已记录的后顾

- **内存缓冲**：150MB 音频整包进内存是明确的 v1 取舍；后续用 `stream.tee()` + `putObject(stream)` 流式直传优化，不改变 API 合同。
- **音频大小上限 150MB 为草案值**，以实际 FLAC 语料校核。
- **`R2_PUBLIC_URL` 的 `@url:` 前缀**必须在实施前由 Hana 修正，否则 `z.url()` 启动即失败。
- **上传 FormData 通道**是现有 `http.ts` 的新增形态，保持 JSON 通道不变、仅扩展一个方法。
- 不新增队列/定时清理；PENDING_CLEANUP 实体清理由人工完成，符合个人博客量级。

---

## 十一、实施记录与验收证据（2026-08-02）

> 本附录由实施会话按 §8 记录。状态：**已实施，静态门禁全绿，API 与 Admin 人工验收通过**。

### 1. 交付清单

| 层                   | 变更                                                                                                                                                                                                                                                                                                                                                                              |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/contracts` | 新增 `src/assets.ts`（purpose/mediaType/status 枚举、`assetDtoSchema`、`assetReferenceCountsSchema`、列表/详情/上传/状态迁移响应的 DTO 与 response schema）；`apiErrorCodeSchema` 并入 `ASSET_PAYLOAD_TOO_LARGE`/`UNSUPPORTED_MEDIA_TYPE`/`UPLOAD_FAILED`/`ASSET_REFERENCED`；index 再导出                                                                                        |
| `packages/db`        | 仅新增类型导出 `export type { PrismaClient }`（无迁移、无 schema 变更）                                                                                                                                                                                                                                                                                                           |
| `apps/api`           | `env.ts` 新增 5 个必填 R2 变量 + 派生 `R2_ENDPOINT`/`R2_REGION`/`ASSET_PUBLIC_URL`；`adapters/object-storage/r2.ts`（put/deleteObject 窄接口）；`modules/assets/{contracts,service,routes}.ts`；`bootstrap/dependencies.ts` 注入 `objectStorage` 与 `assets`；`app.ts` CORS 加 `DELETE` 并挂载 `/assets`                                                                          |
| `apps/admin`         | 准入 `@tanstack/react-router@1.170.18`（code-based）；`routes/route-tree.tsx`（`/`→`/assets`、`/assets`、`/assets/:assetId`）；`features/assets/{display,list-page,upload-dialog,detail-page}`；`app/api/http.ts` 扩展 FormData/URLSearchParams/onUploadProgress + **XHR 上传通道**；`app/api/assets.ts` `createAssetsApi`；`ApiClient.assets`；`AdminShell` 认证分支变为路由出口 |

### 2. 静态门禁

`pnpm typecheck`、`pnpm lint`、`pnpm fmt:check`、`pnpm build`（全 workspace，含 Nuxt main）全部通过。

### 3. API 人工验收（本地 dev：API=2408，postgres 由 OrbStack 承载）

- [x] 成功上传：POST `/assets/upload`（multipart file+purpose，Bearer ADMIN）→ 201，DTO 含 `width=1,height=1`、`purpose=ARTICLE_COVER`、`byteSize=70`、`deliveryUrl=https://blog-r2.caelum.moe/article-covers/202608/<uuid>.png`；列表/详情一致。
- [x] 音频元数据：上传最小 MP3（MUSIC_SOURCE，120 帧）→ 201，`mediaType=AUDIO`、`mimeType=audio/mpeg`、`durationMs=3135`；公开 URL 200 `audio/mpeg`；key 落 `music-sources/202608/<uuid>.mp3`。
- [x] 权限拒绝：普通 USER token 上传 → `403 AUTH_FORBIDDEN`。
- [x] 校验失败：HTML 伪装 `image/png` → `415 UNSUPPORTED_MEDIA_TYPE`（命中规格不符）；21MB jpeg → `413 ASSET_PAYLOAD_TOO_LARGE`；`?page=abc` → `400 VALIDATION_FAILED`。失败请求均无 DB 行产生。
- [x] 过滤器：`?purpose=MUSIC_SOURCE`、`?mediaType=AUDIO`、`?mediaType=IMAGE&purpose=MUSIC_SOURCE=0` 命中正确。
- [x] 生命周期：`PATCH AVAILABLE→PENDING_CLEANUP`→`恢复 AVAILABLE`→再 `PENDING_CLEANUP`→`DELETE`→`status=DELETED`；重复 DELETE 幂等返回 200。S3 `HeadObject` 在删除后返回 NotFound（**R2 对象已移除**）。
- [x] `ASSET_REFERENCED`：直接向 `Article.coverAssetId` 写入引用后，详情显示 `articleCovers=1,total=1`；`PATCH→PENDING_CLEANUP` 返回 `409 ASSET_REFERENCED`；`DELETE`（非 PENDING_CLEANUP 态）返回 `409 CONFLICT`。
- [x] 并发：两个并行上传 key/ID 互不串（`article-inline/202608/<uuid1>.<uuid2>.png`）。
- [x] 孤儿补偿：以不可达 DB URL 构造 service 调用 upload → 返回 `UPLOAD_FAILED`；R2 中该 purpose 前缀对象数为 0（对象已被补偿删除）。
- [x] 清理：全部 smoke 资产经 API 生命周期删除后，R2 HeadObject 全部 NotFound；DB 恢复 0 资产/0 测试用户。

### 4. Admin 浏览器人工验收（headless Chromium）

- [x] 登录 guard → 认证分支渲染 Router；`/` 重定向 `/assets`；列表空状态、加载骨架、失败重试可用。
- [x] 上传：dialog 六选 purpose 单选 + 文件选择 + **进度条** + 失败原地重试；成功后 dialog 关闭、列表即时刷新。
- [x] 详情：元数据（尺寸/大小/MIME/保存时间）、公开地址一键复制（「已复制」反馈）、引用状态六项 count + 合计。「零引用」可执行 `标记清理`/`彻底删除`，均有二次确认 dialog；`PENDING_CLEANUP` 态显示 `恢复`。
- [x] 生命周期（UI）：标记清理→恢复→再标记→彻底删除，状态在 可用/待清理/已删除 间正确流转。
- [x] 筛选：`状态=可用` 后已删除项从列表消失；`清除` 恢复全量。
- [x] 布局：桌面 3 列卡片网格（grid-cols-1/sm:2/lg:3）；375px 手机单列（卡片宽 351px）、上传 dialog 贴底成 bottom sheet（bottom=759/780）。
- [x] 最小命中 44px（min-h-10.5/11）、键盘可达（RAC Button/Select/RadioField/Modal）、danger 操作非唯一 hover 入口。

### 5. 实施偏差与说明

1. **purpose 不落库，由 storage key 前缀推导**：切片决策为「无迁移」，Asset 表无 purpose 列；`modules/assets/contracts.ts` 维护 purpose↔目录双向常量，`toAssetDto` 从 `storageKey` 首段还原 purpose（`Directory → purpose` 静态 Record；未知前缀按 mediaType 防御回退）。
2. **上传通道改为 XHR**：`http.ts` 的 ky 传输在带 `onUploadProgress`（把 FormData 包成流 + `duplex:'half'`）时，跨域 `POST /assets/upload` 于本环境浏览器触发 `net::ERR_ALPN_NEGOTIATION_FAILED`（GET/PATCH/裸 fetch 均正常）。改为 XHR 原生 `upload.onprogress`，保留 envelope 解码与 `AUTH_REQUIRED` 单飞 refresh 重试语义（见 `http.ts` 内注释）。
3. **`/` 根跳转**：`beforeLoad` 返回 `{ redirect }` 在本版本 TanStack 未触发导航，改用 `RedirectToAssets` 组件内 `useNavigate`（避免 `only-throw-error` 与功能问题）。
4. **`.env` 的 `@url:` seam 已就绪**：当前 `.env` 中 `R2_PUBLIC_URL` 已是纯 `https://blog-r2.caelum.moe`，无需 Hana 再改；`.env.example` 已补 5 行 R2 占位。
5. **`pnpm run auth:promote-admin -- --email …` 转发多一个 `--`**（pnpm v11），CLI 用 `node --import tsx src/cli/promote-admin.ts --email …` 直调可用；属既有脚本行为，本切片未改。
6. **公开 URL 在删除后的边缘缓存**：R2 自定义域经 CDN 缓存，删除后极短期仍可能 200；S3 侧经 `HeadObject` 已确认对象真正消失。
7. **oxfmt** 顺带规范化了既有认证计划 md 的 markdown 表格空白（纯空白，无内容变化），使 `pnpm fmt:check` 恢复全绿。
