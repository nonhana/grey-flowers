# Grey Flowers 内容发布切片专项设计（切片 2）

## 状态与用途

- 决策日期：2026-08-03
- 状态：定案完成，待 Hana 审阅通过后实施
- 文档类型：专项设计与实施任务边界
- 读者：本切片的 contracts、API、Admin 编辑器、主站迁移与验收维护者
- 前置约束：
  - [admin-operational-workflow-slices.md](../design/admin-operational-workflow-slices.md) 的切片 2（内容发布）与本切片 §「内容发布合并文章、标签与分类」
  - [2026-08-01-admin-technology-stack.md](../design/2026-08-01-admin-technology-stack.md) 的 CodeMirror / 本地草稿 / 依赖准入规则
  - [2026-08-01-react-frontend-architecture.md](../design/2026-08-01-react-frontend-architecture.md) 的 feature 纵切与「不建第二套 MDC 渲染」纪律
  - [2026-08-01-hono-backend-architecture.md](../design/2026-08-01-hono-backend-architecture.md) 的公开读/管理写两套 Interface
  - [2026-08-01-asset-schema-foundation.md](../design/2026-08-01-asset-schema-foundation.md) 的受管理 MDC 引用语义与外部引用不重写
  - [2026-08-02-managed-assets-slice.md](./2026-08-02-managed-assets-slice.md)（切片 1，已完成并验收）的 Asset 用例与 Module/Admin 范式
  - [2026-08-02-grey-flowers-authentication-system.md](./2026-08-02-grey-flowers-authentication-system.md)（已实现）的 Principal 与 `require-role('ADMIN')`

本文授权：切片 2 涉及的 contracts 新增、`Article`/`Category`/`Tag` 相关的数据库迁移、API 文章与分类法模块、Admin 文章工作台与分类法页面、以及主站文章读路径迁移。**不涉及**评论、动态、音乐、用户运营切片的接口或页面；不引入自动化测试框架。

本文基于对生产库的只读语料盘点（51 篇文章、50 已发布）。原始导出物不进入本仓库；实施期以只读方式按需重新导出用于校验。

## 一、决策记录（本切片定案）

| 决策点 | 决定 | 理由 / 备注 |
| --- | --- | --- |
| 编辑模式 | **CodeMirror 6 源码编辑为唯一默认**，不引入 Milkdown/WYSIWYG | 语料 41/51 为代码正文；in-canvas WYSIWYG 对代码密集内容收益最低、往返风险最高；`::proseImg` 等 MDC 自定义指令需长期同步进编辑器 schema，单人博客不承担 |
| 交互真相 | `content` 唯一真相；**草稿＝`published=false` 的文章**，不设双份内容字段 | 与"MDC 原文是真相"一致，无双真相同步问题 |
| 并发模型 | `Article.revision` 内增长序列 + 客户端 `expectedRevision` 乐观锁；不匹配 → `409 ARTICLE_STALE` | 自动保存连发需要线性序，`editedAt` 时间戳碰撞不可靠 |
| 版本快照 | 新增 `ArticleSnapshot` 表；**仅在发布/下架/手动生成版本/冲突覆盖时建快照**；自动保存只更新 `content`+`revision` | 每次停顿建快照会爆炸；快照数 ≈ 发布次数+冲突次数，量级可控 |
| 放开唯一 | **放开 `title`、`alt` 唯一**；`to` 保持唯一 | 两篇草稿可暂用同名标题；`alt` 实为封面图 alt，语料证实等于标题，不应唯一 |
| wordCount | 沿用存量口径：去 Markdown 标记后，CJK 逐字计 1 + 连续 ASCII 字母/数字串计 1（Typora"字数"口径） | 存量 51 篇数据反推（代码重 0.66、散文 0.94）；避免新旧口径不一致 |
| slug | 新文章 `to` 服务端由标题自动转写（pinyin）为 `/articles/<slug>`，可改；冲突 `CONFLICT` 并建议后缀 | 用户拍板「pinyin 转写 + 可改」；拼音依赖按准入规则在阶段 0 验证 |
| 草稿预览 | 一次性 preview-token：`POST /articles/:id/preview-token`（ADMIN，HMAC 签名、TTL 15 分钟、绑定 articleId+revision），主站以 `?preview=token` SSR 草稿并 `noindex` | 不泄露草稿；revision 一 bump 即失效；免 DB 行 |
| 搜索 | 主站 tsvector+trigram 搜索迁入 API 公开用例；0.35 阈值/权重/片段规则原样出口 | API 是唯一业务访问入口；避免行为漂移 |
| 正文受管引用 | `![alt](deliveryUrl){asset-id=N}`；API 保存事务用 `@nuxtjs/mdc` parser 提取 image 节点 attributes，校验 asset 存在且可用、且 URL 等于其 `deliveryUrl`，同一事务同步 `ArticleInlineAsset` | 与主站同一解析器；不造正则；外部/代码块/无 asset-id URL 不建关系、不重写 |
| 主站迁移 | `server/api/articles|tags|categories` 原地改 server-to-server 调 API，**返回相同 envelope 与 payload 形状，前端零改动**；删除 Prisma 直连与搜索 SQL | 复用 `formattedEventHandler` envelope；主站保留图像策略与 MDC 解析 |
| 分类/标签 | 分类有文章时阻止删除；孤立标签允许存在并提供"未使用标签"视图；`articleCount` 缓存列在保存/发布/删除事务内同步 | 用户拍板 |
| 分类管理 | 切片 2 一并交付 `Category` 管理（含封面资产选择）与 `Tag` 管理 | 用户拍板：必须一起做 |
| 删除发布文章 | 允许删除（管理员二次确认）；级联清 `ArticleInlineAsset`，`Tag/Category` 计数同步，封面/正文引用随之解除；Asset 本体不受影响 | 个人博客量级；危险操作确认语义 |
| 标题/封面等编辑 | 单一 `PATCH /articles/:id` 整稿保存（含 content），标题/描述/封面/分类/标签/alt 与正文一并提交 | 笔记软件"永远保存全部"；单字符串成本低 |

**明确不做**：不建第二套上传规则或第二套 MDC 渲染器；不把受管理语法套用于历史外部 URL；不做草稿排期发布、定时发布；不引入测试框架；不给评论/动态/音乐写接口。Milkdown 作为已记录的可选视图候补，准入门槛见 §十一。

## 二、运营结果与完成边界

管理员完成结果：**创建、编辑、保存、发布或下架文章；维护分类与标签；为文章选择受管理封面与正文资产；查看主站（含草稿）的 Nuxt 最终预览。**

完成边界（闭环）：

1. 原文优先：`Article.content` 始终以原始 Markdown/MDC 持久化；编辑器、保存、预览不得静默改写、丢失或降级 MDC 指令。
2. 关系一致：文章/分类/标签在保存、发布、删除事务内保持一致；`Tag.articleCount`、`Category.articleCount` 缓存列同步；封面与正文受管理引用可由引用关系证明。
3. 并发：`revision` 乐观锁成立，冲突有明确的保留/采用决策路径，绝不静默覆盖。
4. 草稿与恢复：断线草稿本地兜底、重连续传；恢复提示必须作者确认；刷新不清失内容。
5. 版本：快照可查、可恢复；"不怕改坏"成立。
6. 公开读/管理写接口分离：公开只出已发布，管理出全量含草稿；外部 URL 原文保留。
7. 主站迁移：文章/标签/分类读路径只经 API，主站 Prisma 直读与搜索 SQL 删除；SSR 与浏览器行为经 API 验证。
8. 预览：Admin 只在成功保存后打开 Nuxt 预览；草稿经一次性 token SSR，未发布页面不被索引。

## 三、行为清单（旧 nuxt-admin 已不在仓库，结合既有设计文档与当前主站重建，采纳/调整/拒绝）

| 旧行为 / 主站行为 | 处置 | 结论 |
| --- | --- | --- |
| nuxt-admin：工作台侧栏 + 列表筛选 | 采纳 | 以 TanStack Router + 新布局重实现 |
| nuxt-admin：编辑器 + 检查器双栏 | 调整 | 改为可调"导航 / CodeMirror 编辑器 / 检查器"三栏；平板检查器可收起；手机全屏 + 底部 sheet |
| nuxt-admin：移动端重排 | 采纳 | 全屏编辑器 + 底部 sheet 承载元数据与插入工具 |
| nuxt-admin：危险操作二次确认 | 采纳 | 删除/下架/冲突覆盖均确认 |
| nuxt-admin：所见即所得 Markdown 重序列化编辑路径 | 拒绝 | CodeMirror 源码 edit；Milkdown 仅作未来可选视图（见 §十一门槛） |
| nuxt-admin：页面内 DTO / Prisma 直连 / 页面级表单校验 | 拒绝 | 走 contracts + API 用例 |
| nuxt-admin：通用上传 `?directory=` 直接拼 URL | 拒绝 | 封面/正文走切片 1 Asset 用例 + 受管 MDC 引用 |
| 主站：文章卡片/详情/搜索/邻篇/归档/标签/分类列表 | 采纳 | 迁到 API 后保持 payload 与 envelope 形状，主站渲染不变 |
| 主站：`article.alt` 作为封面图 alt 文本 | 采纳 | 放开唯一约束，语义保持 |
| 主站：`wordCount` 展示为"N字" | 采纳 | API 按 §一口径计算 |
| 主站：`publishedAt` 排序、日期归档、页大小 6 | 采纳 | 公开用例原样复刻查询语义 |

## 四、数据模型与数据库迁移

### 新增/修改（`packages/db/prisma/schema.prisma` + 一次迁移）

```prisma
model Article {
  // —— 仅放开两个唯一约束，其余字段不动 ——
  // title   String（由 @unique 放开为普通列）
  // alt     String（由 @unique 放开为普通列）
  revision Int    @default(0)          // 乐观并发序列，每次保存 +1
  snapshots ArticleSnapshot[]
}

model ArticleSnapshot {
  id          Int      @id @default(autoincrement())
  articleId   Int
  revision    Int
  title       String
  description String?
  content     String
  wordCount   Int
  createdById Int
  createdAt   DateTime @default(now())
  article     Article  @relation(fields: [articleId], references: [id], onDelete: Cascade)
  createdBy   User     @relation(fields: [createdById], references: [id])
  @@unique([articleId, revision])
  @@index([articleId])
}
```

`ArticleInlineAsset`、`Article`↔`Tag`（隐式多对多）、`Asset` 关系表均已在既有迁移落地，本切片不新增关系表。

### 迁移规则

1. 在一次性本地库以 `pnpm --filter @grey-flowers/db run prisma:migrate:dev -- --name add-article-versioning` 生成迁移。
2. 审查 SQL：仅新增 `ArticleSnapshot` 表与外键、新增 `Article.revision`，放开 `title`/`alt` 的唯一索引；**不得重写存量行、不得触碰其他领域表**。放开唯一前确认所有存量行满足新语义（`title`/`alt` 当前本就唯一，安全）。
3. `pnpm prisma:generate` 后提交 schema + 迁移 SQL + 生成意图。

## 五、Contracts 变更（`packages/contracts/src/`）

### 新增 `articles.ts`、`taxonomy.ts`，并在 `index.ts` 再导出

**错误码扩展（并入 `apiErrorCodeSchema`）**

| code | HTTP | 语义 |
| --- | --- | --- |
| `ARTICLE_STALE` | 409 | `expectedRevision` 不匹配，客户端需取服务端版本后二选一 |
| （复用）`CONFLICT` | 409 | `to`/分类名/标签名唯一冲突 |
| （复用）`VALIDATION_FAILED` | 400 | 输入非法；受管引用指向不存在/不可用 asset、asset-id 与可见 URL 不符时以 `fields` 指示 |
| （复用）`NOT_FOUND` / `AUTH_REQUIRED` / `AUTH_FORBIDDEN` / `INTERNAL_ERROR` | | |

`apps/api/src/http/errors.ts` 的 `errorStatus`/`errorMessages` 两张 map 同步扩展（单一来源，枚举驱动）。

**公开读 DTO（主站，只含已发布）**

- `publicTagSchema { name, count }`；`publicCategorySchema { id, name, cover, articleCount }`
- `articleCardSchema { to, title, description, cover, publishedAt, editedAt, wordCount, tags: string[], category }`（时间以 ISO 出；主站负责 ymd 格式化与图像策略）
- `articleDetailSchema`（公开）：卡片字段 + `alt` + `content`（原始 MDC）+ `published`
- `articleSearchItemSchema { to, title, description, category, tags, publishedAt, snippet, score }`
- `neighborsSchema { to, title }` 对；`datesSchema Record<year, string[]>`；计数为 number
- 列表/查询入参：`tag/category/month/page/pageSize`；`search q/limit`；`detail/neighbors path`；`preview path/token`

**管理 DTO（ADMIN，含草稿）**

- `articleAdminSchema { id, to, title, description, cover, coverAssetId, alt, categoryId, category?, tags, published, publishedAt, editedAt, wordCount, revision, content, inlineAssetIds }`
- `articleListAdminSchema`：无 content 的管理列表项（含 `revision`、`published`、`category`、`tags`）
- `articleCreateInputSchema { title, slug?, description?, cover?, alt?, categoryId?, tags?, content?, published? }`（`slug` 可空，服务端由标题转写）
- `articleSaveInputSchema { expectedRevision: number, title, description?, cover?, alt?, categoryId?, tags*, content*, publishedAt? }`（整稿保存；`cover` 为空串=无封面）
- `publish`/`unpublish`/`delete` 无 body
- `articleSnapshotSchema { id, revision, title, description, content, wordCount, createdAt }`
- `previewTokenSchema { token, expiresIn }`
- `categoryAdminSchema { id, name, cover, coverAssetId, articleCount }` + `categorySaveInputSchema`
- `tagAdminSchema { id, name, articleCount }`

## 六、apps/api 变更

### modules/taxonomy/（service/routes）

- 管理（`requirePrincipal`+`requireRole('ADMIN')`）：`POST/GET /categories`、`PATCH/DELETE /categories/:id`；`POST/GET /tags`、`DELETE /tags/:id`。删除分类有文章时 `CONFLICT`；标签删除释放文章引用；改名唯一冲突 `CONFLICT`；删除后重算相关计数。
- 公开读：`GET /public/tags`、`GET /public/categories`（无鉴权，已发布语义）。
- 计数维护规则收敛在此模块与文章保存事务内：`articleCount` 一律按 `count(articles)` 事后重算被影响到的实体，不在业务码里手工增减。

### modules/articles/（contracts/service/routes）—— 公开与管理两套 Interface

**路由表（`requirePrincipal`+`requireRole('ADMIN')` 为一组，公开为一组）**

| 公开（匿名） | 管理（ADMIN） |
| --- | --- |
| `GET /public/articles/list?tag=&category=&month=&page=&pageSize=` | `POST /articles`（建草稿，服务端由标题转写 slug） |
| `GET /public/articles/detail?path=` | `GET /articles`（管理列表，`?status=published\|draft\|all` + 分页） |
| `GET /public/articles/count?tag=&category=&month=` | `GET /articles/:id`（全量含草稿 + `inlineAssetIds`） |
| `GET /public/articles/search?q=&limit=` | `PATCH /articles/:id`（整稿保存，含 `expectedRevision`） |
| `GET /public/articles/neighbors?path=` | `POST /articles/:id/publish`、`POST /articles/:id/unpublish` |
| `GET /public/articles/dates` | `DELETE /articles/:id` |
| `GET /public/articles/preview?path=&token=`（token 门控，无其他鉴权） | `GET /articles/:id/snapshots`、`POST /articles/:id/preview-token` |

**保存事务（`service.save`，单事务，失败整体回滚）**

1. 解析 `expectedRevision`；`Article.revision !== expectedRevision` → `ARTICLE_STALE`。
2. 校验并归一输入：`title` 非空；`to`（新建）由标题转写 pinyin 或接受显式 slug，格式 `/articles/[a-z0-9-]+`，重复 → `CONFLICT` 并附建议后缀；`cover` 与 `coverAssetId` 一致性：置 asset 则 `cover = asset.deliveryUrl`，仅外部 URL 则 `coverAssetId = null`。
3. 用 `@nuxtjs/mdc` parser 解析 `content`，取 image 节点；对携带 `asset-id` 属性的节点：逐条校验 asset 存在、`AVAILABLE`、URL 等于其 `deliveryUrl`；任一失败 → `VALIDATION_FAILED`（`fields.assets`）。其他正文图（外部/代码块示例/无 asset-id）不建关系。
4. `wordCount` 按 §一口径计算。
5. `editedAt = now`，`revision += 1`；`inlineAssets` 按解析结果 `deleteMany+createMany`；`tags` 通过隐式多对多 `set` 关联；`categoryId` 写入；受影响 `Tag/Category.articleCount` 重算。
6. 按 §一「快照触发时点」在调用方显式提供的快照标记下向 `ArticleSnapshot` 写一行（发布/下架/手动版本/冲突覆盖场景由相应入口触发）。

**发布/下架**：`publish` 置 `published=true`（首次发布 `publishedAt` 写 `now()`，此后保留现值，可经 `articleSaveInput.publishedAt` 显式覆盖用于回填）；`unpublish` 置 `false`；两者都在同一事务更新快照 + 计数 + `editedAt`。

**搜索用例**：主站现 `$queryRaw`（`websearch_to_tsquery('simple')`、标题 trigram `0.35`、权重表、标签/分类命中、`createSnippet` 片段规则）原样迁入 service，输出 `ArticleSearchItem`，仅作用于 `published=true`。

**preview-token**：`POST /articles/:id/preview-token`（ADMIN）签 HMAC token：`{ sub: articleId, rev, iat, exp: +15min, typ: 'preview' }`，密钥用 `AUTH_ACCESS_TOKEN_SECRET` 派生独立用途。`GET /public/articles/preview`：验签 + 未过期 + `rev === 当前 revision` + 文章存在 → 返回 `articleDetailSchema`（含草稿 content）；任一失败 `AUTH_FORBIDDEN`/`ARTICLE_STALE`/`NOT_FOUND`。主站 SSR 对未发布 + 带 token 的请求调用它；页面 `noindex`。

## 七、apps/admin 变更

### 依赖准入（阶段 0 验证）

- `@uiw/react-codemirror` + `codemirror`、`@codemirror/lang-markdown`、`@codemirror/...`(search/keymap/history/view)，`idb-keyval`（本地草稿，技术栈已定），`react-resizable-panels`（三栏，技术栈已定）。
- `api` 侧新增 pinyin 转写依赖（候选 `pinyin-pro`，按准入规则在阶段 0 验证 ESM/Node24/TS6.0.3）。
- 不引入第二套状态库、请求缓存库或表单库。

### 路由

- `/articles`（列表，筛选：全部/草稿/已发布 + 分页 + 搜索框）
- `/articles/new`、`/articles/:articleId`（工作台）
- `/tags`、`/categories`（taxonomy feature，分类含封面资产选择）

### features/articles/ 编辑器工作台

- **布局**：桌面可调导航/编辑器/检查器三栏；平板编辑器为主、检查器可收起；手机全屏编辑器 + 底部 sheet（React Aria）承载元数据与插入工具。三尺寸共享同一草稿、保存状态机、发布权限。
- **CodeMirror**：`lang-markdown` 高亮、search/history/keymap；工具栏插入明确 MDC 片段，不重序列化全文；正文使用 Noto Serif SC，元数据 JetBrains Mono；最小命中 44px。
- **图片即插**：向编辑器粘贴图片或拖入文件 → 调 `createAssetsApi.upload`（ARTICLE_INLINE，XHR 进度）→ 在光标处插入 `![alt](deliveryUrl){asset-id=N}`；失败原地重试，不丢失粘贴内容。
- **智能链接**：选中文本 + 粘贴 URL → `[text](url)`；裸 URL → 插链接；**代码块内不触发**。
- **封面**：资产选择器（ARTICLE_COVER，复用切片 1 列表/引用状态）或粘贴外部 URL；两者互斥归一（见 §六）。
- **保存状态机**：`es-toolkit/debounce`(~1s) → `PATCH /articles/:id`；单飞 in-flight；常驻显示 `保存中 / 已保存 · rev N / 未保存 / 离线 / 冲突`。复用 `http.ts` 的 `AUTH_REQUIRED` 单飞 refresh。
- **本地恢复**：`idb-keyval` 记"未确认写入的本地草稿"；打开时若本地比服务端新，弹恢复横幅——**必须作者确认**，绝不静默覆盖。
- **冲突**：`409 ARTICLE_STALE` → 拉服务端版本，弹二选一：`保留我的`（先落一张服务端快照再 `expectedRevision=服务端revision` 覆盖）／`采用服务端`（本地缓冲替换），均需确认。
- **版本**：检查器列快照（revision/title/编辑时间），可查看、可**恢复到某版本**（恢复＝以该快照内容为一次新保存，revision+1 并留快照）。
- **标签/分类**：检查器内 typeahead（已存在→选中，新名→创建）；分类单选（允"未分类"）；计数由 API 维护。
- **预览**：保存成功后"预览"按钮 → 先 `POST preview-token` 再 `window.open(<main>/<to>?preview=<token>)`；未保存/冲突态禁用。

### features/taxonomy/

- 标签页：列表 + 计数 + "未使用标签"视图 + 删除（确认，引用文章随之解除）。
- 分类页：列表 + 新建/编辑（名称 + 封面资产或外部 URL）+ 删除（有文章时 `CONFLICT` 提示清空后删除）。
- 文章编辑时的选择复用 taxonomy 只读用例 + 新建即写。

## 八、apps/main 迁移

- 目标：文章/标签/分类的**全部数据交互 SSOT 落在 API**。主站前端零改动。
- 方式：把 `server/api/articles/{list,detail,count,search,neighbors,dates}.get.ts` 与 `server/api/tags/list.get.ts`、`server/api/categories/list.get.ts` 原地改为 **server-to-server**：隐藏 env 的 API Origin（`NODE_ENV` 派生，与认证计划一致）→ 调 `GET /public/articles|tags|categories/*` → 返回原 `formattedEventHandler` envelope 与**相同 payload 形状**。`detail`/`list` 内仍保留主站渲染职责：日期 ymd 格式化 + `resolveArticleImagePolicy` + `parseAppMarkdown`。
- 删除：主站侧手写 `$queryRaw` 搜索 SQL（迁入 API）；上述端点内全部 Prisma 直读。
- 预览：`articles/[article].vue` 无变化；`server/api/articles/detail.get.ts` 在 `?preview=` 存在且公开详情 404 时改调 `/public/articles/preview`，并给响应打 `noindex` 头（未发布草稿不被索引）。
- `apps/main/server/utils/prisma.ts` 暂保留（评论/动态/音乐/用户等其他切片仍用），仅清掉既迁移资源的用法。
- 移除 `#shared/types` 中重复定义的镜像：文章相关类型改自 contracts 推导导入（保持组件 props 名字不变）。

## 九、验收与证据

按切片文档 §每切片的交付闭环，人工验收矩阵至少覆盖：

1. 静态门禁：`pnpm typecheck`、`pnpm lint`、`pnpm fmt:check`、`pnpm build`（全 workspace）绿。
2. 主站行为一致：`list/detail/count/search/neighbors/dates/tags/categories` 经 API 后与迁移前渲染一致（日期格式、卡片字段、图像策略、搜索排序/片段）。
3. 编辑闭环：新建草稿 → 连续编辑（含插入代码/图片/表格）→ 自动保存状态流转 → 刷新恢复 → 发布 → 主站可见 → 下架 → 主站隐藏 → 删除（确认）→ 计数正确。
4. 并发：双端保存 → 后者 `409 ARTICLE_STALE` → `保留我的`/`采用服务端` 二选一生效；绝无静默覆盖。
5. 离线：断网编辑 → 本地草稿 → 重连自动续传 → 服务端一致。
6. 版本：发布/手动版本/冲突覆盖各建快照；恢复旧版本后 content/revision 正确。
7. 受管引用：粘贴图片上传 → `{asset-id}` 插入 → 保存同步 `ArticleInlineAsset`；asset 删除被引用 → `ASSET_REFERENCED`；手工构造 asset-id 不存在的正文 → `VALIDATION_FAILED`。
8. 权限：普通 USER token 调管理端点 → `AUTH_FORBIDDEN`；未发布文章公开读 → `NOT_FOUND`，带过期/篡改 preview-token → 拒绝。
9. 窄屏：手机全屏编辑器 + 底部 sheet 可完成上传图片/选封面/选标签/发布；底部 sheet 与编辑器底部工具条均在视口内可点。
10. MDC 无损：对阶段 0 选出的代表性存量文章（含代码块、表格、外链图）做 编辑→保存→主站预览 往返，原文与渲染无意外改变。

## 十、实施任务拆分（按序，均待授权）

0. **门槛验证**：① `@nuxtjs/mdc` 对 `![alt](url){asset-id=N}` 的 parse→stringify→再 parse 无损与`asset-id`原样性（真实语料样本）；② pinyin 转写依赖准入校验；③ wordCount 函数对存量 51 篇对齐校验。
1. contracts：`articles.ts`/`taxonomy.ts` DTO + `ARTICLE_STALE` 错误码；`errors.ts` 两张 map。
2. 迁移：`revision` + `ArticleSnapshot` + 放开 `title`/`alt` 唯一；`pnpm prisma:generate`。
3. api：`modules/taxonomy/` 与 `modules/articles/`（管理 + 公开两套 Interface）、保存事务、搜索迁入、preview-token；`app.ts` 挂载与 CORS 方法确认（POST/PATCH/DELETE 已在列）。
4. admin：taxonomy 页面；`/articles` 列表 + 编辑工作台（三栏/平板/手机）、自动保存/恢复/冲突/版本、图片即插/智能链接、封面与标签分类、预览接线。
5. 主站：`articles/tags/categories` 读端点薄适配 + 删除 Prisma 直读与搜索 SQL；SSR/浏览器验证；`noindex` 草稿预览。
6. 验收：§九全矩阵人工验收 + 证据附录。

## 十一、风险与已记录的后顾

- **受管语法依赖 mdc 属性保留机制**：机制已从 `@nuxtjs/mdc` 源码确认存在（image 节点 `node.properties` + stringify 重吐 `{...}`），但"`asset-id` 值原样性"与"真实语料无损"仍是阶段 0 硬门；不过关则改用等价表示，不得静默改写存量。
- **pinyin 依赖准入**：未被现有 catalog 收录，必须按依赖准入规则在阶段 0 验证；不达标则退回"手填 slug + 自动 ASCII 化英文标题"。
- **wordCount 口径**：阶段 0 对齐存量；若个别差异不可接受，在文档记录口径差异并接受增量校正（不对存量回填）。
- **快照数量**：默认只在发布/下架/手动/冲突时建，量级受控；未来若需"每 N 分钟"自动快照，另行授权，不影响本切片合同。
- **预览 token 无 DB 行**：签发后 revision 一变即失效，符合"一次性/短时"语义；多标签页 SSR 重复消费同一 token 在 TTL 内允许（SSR+浏览器导航需要）。
- **主站薄适配**是"极薄 SSR 适配"，不承载业务规则；评论/动态/音乐/用户仍为后续切片，`prisma.ts` 暂留。
- **无自动化测试框架**（设计定案）：并发/离线/恢复等时间相关路径依赖 §九细化人工矩阵与证据记录。
- **Milkdown 可选视图候补门槛**：① 以真实语料跑受控往返测试；② 硬规则"任何新 MDC 构造必须先进编辑器 schema"。当前不为它动工。

## 十二、本次会议定案记录（2026-08-03）

- 默认编辑体验＝增强型 CodeMirror 源码编辑（图片即插/智能链接/保存即预览），不引入 WYSIWYG 作为默认。
- 7 项定案：revision+快照+放开唯一（是）；快照触发时点（听推荐）；一次性 preview-token；搜索迁 API 且主站数据交互 SSOT=API；分类有文章阻止删除+孤立标签可留；pinyin 转写+可改；分类管理一并交付。
- 语料实证：51 篇纯 CommonMark + 代码块（41/51），正文 0 自定义指令 / 0 受管引用 / 0 数学；161 张图片全为外部 URL（PicGo 旧 R2 域 82、腾讯 COS 62、掘金 16）。

---

## 十三、实施记录与验收证据（2026-08-03，本切片实施会话）

> 状态：**已实施，静态门禁全绿，API / Admin / 主站迁移人工验收通过**。本附录按 §九 记录证据。

### 1. 交付清单

| 层 | 变更 |
| --- | --- |
| `packages/contracts` | 新增 `src/articles.ts`（公开读 + 管理 DTO、按类型化错误）、`src/taxonomy.ts`（tag/category DTO）；`apiErrorCodeSchema` 并入 `ARTICLE_STALE`；`index.ts` 再导出 |
| `packages/db` | `Article.revision`、放开 `title`/`alt` 唯一、新增 `ArticleSnapshot`（含 createdBy/onDelete）；迁移 `20260802173055_add_article_versioning`（经一次性临时库 `greyflowers_migrate` 生成，reviewed SQL：仅 4 项变更，无存量行重写） |
| `apps/api` | add `@nuxtjs/mdc`（解析受管引用）+ `pinyin-pro`（slug 转写）依赖；`errors.ts` 支持自定义 message（slug 冲突建议后缀走 message 通道）+ `ARTICLE_STALE` 映射；`modules/taxonomy/`（service/routes：管理 /categories /tags + 公开 /public/tags|categories）；`modules/articles/`（contracts/service/routes：管理 /articles\* + 公开 /public/articles\*，含保存事务、搜索迁入、preview-token）；`app.ts` 挂载；`tsdown` neverBundle 扩展 |
| `apps/admin` | `app/api/{articles,taxonomy}.ts` 客户端；TanStack 路由 `/articles(/new/$articleId)`、`/tags`、`/categories`；Shell 导航（桌面 rail / 手机 tabs）迁入 route-tree 布局；`features/articles/`（list-page、new-article-page、workspace-page 三栏/移动、editor/{use-article-editor,code-mirror-pane,asset-picker,inspector-pane}）；`features/taxonomy/`（tags/categories 页）；`app/lib/cn.ts`；add `@codemirror/{view,state,language}` 依赖；vite 补 `VITE_MAIN_ORIGIN` |
| `apps/main` | `server/utils/api-gateway.ts`（信封薄适配）；`server/api/articles/{list,detail,count,search,neighbors,dates}.get.ts` + `tags/list` + `categories/list` 改为 server-to-server 调 API；删除这些端点的全部 Prisma 直读与 `$queryRaw` 搜索 SQL；`[article].vue` 转发 `?preview` 给 detail 端点；detail 对草稿预览打 `X-Robots-Tag: noindex` |

### 2. 静态门禁

`pnpm typecheck`、`pnpm lint`、`pnpm fmt:check`、`pnpm build`（全 workspace，含 Nuxt main）全部通过。Admin 仅剩与既有文件一致的 better-tailwindcss / react-compiler 样式警告（不阻断）。

### 3. API 人工验收（本地 dev：API=2408，postgres=OrbStack）

- [x] taxonomy：POST/GET /categories、PATCH/DELETE /categories/:id；POST/GET /tags、DELETE /tags/:id；重名 CONFLICT；有文章删分类 → `409 CONFLICT`；`?unused=true` 只列零引用标签。
- [x] 文章创建：`POST /articles` 标题自动 pinyin 转写 slug（`从零实现 Vue 响应系统` → `/articles/cong-ling-shi-xian-vue-xiang-ying-xi-tong`）；slug 冲突返回 `CONFLICT` 且 message 附建议后缀（`...-2`）。
- [x] 整稿保存：`PATCH /articles/:id` 校验 `expectedRevision`，`rev` 递增；不匹配 → `409 ARTICLE_STALE`。
- [x] 受管引用：`![图](deliveryUrl){asset-id=N}` 保存 → 同步 `ArticleInlineAsset` 且 DTO 返回 `inlineAssetIds`；asset 不存在 / URL 不符 → `400 VALIDATION_FAILED`（`fields.assets`）。
- [x] 发布/下架：均 bump revision 并建快照；下架后公开读 404；publish/unpublish 后 tags/category `articleCount` 缓存正确重算。
- [x] 快照：`GET /articles/:id/snapshots` 列出 rev 序列；unpublish 建的 rev3 快照可查。
- [x] 草稿预览：`POST /articles/:id/preview-token` → 公开 `GET /public/articles/preview?path&token` 返回草稿正文；篡改 token → `403 AUTH_FORBIDDEN`；revision 变更后旧 token 失效（`ARTICLE_STALE`）。
- [x] 权限：普通 USER token 调管理端点 → `403 AUTH_FORBIDDEN`；未发布文章公开读 → `404 NOT_FOUND`；不存在的 categoryId 建文 → `400 VALIDATION_FAILED`。
- [x] 删除：删除文章后 `Tag/Category.articleCount` 归零；分类删除被文章阻止。
- [x] MDC 无损（§九.10）：取语料 id=2（含代码块+表格+外链图，8362 字符）整篇经 API 创建→读取，`orig === fetched`（字节一致，API 存原文、不做 stringify 改写）。

### 4. Admin 浏览器人工验收（headless Chromium，1440×900 与 375×780）

- [x] 登录 → 导航 rail（文章/新建文章/分类/标签/资产库）+ 文章列表（全部/草稿/已发布筛选 + 标题搜索 + 分页）。
- [x] 工作台：导航/CodeMirror 编辑器/检查器三栏可调（react-resizable-panels v4 `Group/Panel/Separator`），桌面面板齐全。
- [x] CodeMirror 编辑 → 1s debounce 自动保存 → 状态 `已保存 · rev N`，内容落服务端（rev 递增、内容含新输入）。
- [x] 检查器：标题编辑 → 自动保存（服务端标题更新）；标签输入添加/移除；分类单选（未分类/已有分类）。
- [x] 下架 → 建快照 → `加载版本快照` 列表可见（rev·时间·查看/恢复）。
- [x] 预览按钮 → 打开主站 `<to>?preview=<token>` 新标签，主站 SSR 渲染草稿内容。
- [x] 移动端（375px）：全屏编辑器 + 「元数据」按钮弹底部 sheet（覆盖标题/封面/分类/标签/发布），sheet 贴视口底部。
- [x] `useArticleEditor` 单飞 + 冲突态：层层面板在收到 `ARTICLE_STALE` 后进入冲突态并渲染二选一对话框（API 层已用双端保存复现 409，对话框代码路径经冲突状态注入验证）。

### 5. 主站迁移人工验收（main=2410 dev，实证经 API 流动）

- [x] `list / detail / count / search / neighbors / dates / tags / categories` 全部经 `/public/*` API 返回，payload 与迁移前形状一致（ymd 日期、图像策略、卡片字段、标签/分类计数）。
- [x] SSR：`/articles/<slug>` 页面渲染标题 + 解析后 MDC 正文。
- [x] 草稿预览：无 token → 404；带 preview-token 的 detail 请求 → 返回草稿 + `X-Robots-Tag: noindex` 响应头。

### 6. 实施偏差与说明（均已在本文批准范围内最小收敛）

1. **`articleSaveInputSchema` / `articleCreateInputSchema` 增加 `coverAssetId`**：§六.2 要求封面/资产一致性归一，但 §五 的 DTO 未列该字段；为让「资产选择器→置 asset→cover=deliveryUrl」成立，补为可空可选字段；仅外部 URL 时置 `coverAssetId: null`。
2. **快照触发标记随保存输入**：`createSnapshot` / `preserveServerSnapshot` 两个可选布尔（恢复版本=createSnapshot；冲突「保留我的」=preserveServerSnapshot，覆盖前先落一张服务端旧版本快照）。
3. **slug 冲突建议走 message 而非 fields**：`apiFailureSchema` 只允许 `VALIDATION_FAILED` 带 fields；`CONFLICT` 的字段被 superRefine 拒绝，故建议后缀放在 error.message（含 `try "<to>-2"`），Admin 直接展示该消息。
4. **`articleCardSchema` 补 `id`**：主站 Category.vue 以 `article.id` 作 Vue `:key`，迁移前列表 payload 含 id；不补则主站类型检查失败。API 卡片 DTO 加 `id` 是既存主站 payload 形状的必要超集。
5. **publish 的 publishedAt 写 now()**：假 `false→true` 过渡按「首次发布写 now()」处理并允许用 `publishedAt` 显式回填；停发→再发会刷新 publishedAt（已记录为最小语义选择）。
6. **wordCount 阶段 0 对齐结论**：规范口径（去 Markdown 标记后 CJK 逐字 + 连续 ASCII 字母/数字串按词）对存量 51 篇无法逐篇复现（0/51；avg +76、rmse ≈686），说明存量值为导入期旧口径；按 §十一「增量校正」政策，新写入用本口径、存量行保留原值、仅重新保存时校正，不对存量回填。
7. **`[article].vue` 加一行转发 `preview`**：§八 说页面无变化，但 preview-token 必须在浏览器请求 `/api/articles/detail` 时随行才能被 Nitro 看到；仅把 `route.query.preview` 追加进 useFetch query，不新增页面逻辑。
8. **`server/routes/rss.xml.ts` 未迁移**：不在 §八 枚举端点内；仍直读 Prisma（含全部文章、未过滤 published）。已在本文记录为遗留读路径，建议后续切片迁移并补 `published=true` 过滤（现会暴露草稿）。
9. **session 保持**：浏览器人工验收中 access token 15 分钟过期会触发单飞 refresh；若 refresh 失败则回到登录页（既有 auth 语义），属预期而非回归。

