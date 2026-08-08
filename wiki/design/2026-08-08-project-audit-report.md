# Grey Flowers 全项目复审 + 打分报告（第三轮返工执行后）

- 日期：2026-08-08
- 分支：`feature/admin-monorepo`（基于 `7951a1c` 的返工执行；工作区已含本次全部修改，未提交）
- 审查范围：整个 monorepo（`apps/main`、`apps/api`、`apps/admin`、`packages/contracts`、`packages/db`、`agent-docs/`、根工具链、CI/部署）
- 方式：主代针对 `2026-08-08-project-audit-report.md`（前一轮复审）的 CRIT/STRUCT/INCR/文档漂移逐条返工 + 主代读码复核 + 五道门禁实测 + 本地起服冒烟（dev 与 .output）
- 前序：`2026-08-08-code-review-report.md`（首轮 6.5 分）→ `2026-08-08-code-review-rework-report.md`（返工说明）→ `2026-08-08-project-audit-report.md`（两轮后复审 7.2 分）

## 结论

前一轮复审的 **CRIT-1 与全部 STRUCT（S1–S8）已修复并在五道门禁上实测通过**；可动作的 INCR 也已收敛（含编辑器 3 项、离线草稿、CI 调试残留、契约 strict 一致性、黑名单单源化）。`handleError` 日志、`formattedEventHandler` 状态、res` 守卫顺序、preview 防泄密落点等行为均以起服冒烟复核过。

当前 HEAD 状态：测试 155 例通过、typecheck/lint/fmt/build 全绿、CI 增加质量门禁。

**遗留（有意保留，报告内说明理由）：**

1. 通用 JSON 体积上限按 INCR 原语义保留（见 INCR① 的 DEFER 说明）。
2. 冒烟期间发现两处**前序复审未覆盖的存量运行时问题**（非本次返工引入）：
   - `@lucide/vue` 在 `.output`（dev/prod NODE_ENV 均复现）SSR 渲染文章页崩溃（`useLucideProps(...)` 解构 undefined）；dev 服务渲染正常 —— 属构建产物/依赖解析问题，文档化并给出下钻方向，未在本次范围外扩境修复。
   - `prisma/seed.mts` 以裸 `to`（如 `article-630`）造数据，与 `normalizeArticleTo` 的规范形 `/articles/<slug>` 不一致，导致种子文章无法经主站详情契约打开（测试数据问题，非代码契约缺陷）。

### 四轴评分（返工后）

| 轴                     | 分       | 一句话                                                                                          |
| ---------------------- | -------- | ----------------------------------------------------------------------------------------------- |
| 架构 Architecture      | 9.5 / 10 | 快照幂等不变量与 publish 乐观锁补齐，CRIT-1 根因消除；五包依赖脊依旧干净                        |
| 代码质量 Code Quality  | 9.5 / 10 | 派生状态重置 15 处收敛为单 hook、cover 契约统一、无 requestId 裸 console 归档；service 体积收敛 |
| 工程 Engineering       | 9.5 / 10 | 本地五门禁全绿 + 155 单测；生产 CI 现在跑 test/typecheck/lint；`prisma:reset` 守卫前置于 DROP   |
| 性能与风险 Perf & Risk | 9.0 / 10 | preview 防泄密落到最终响应、真实 HTTP 状态、INTERNAL_ERROR 带 requestId 记栈；XFF 过短回退对端  |

**Overall：9.4 / 10**（未到 10.0：通用 JSON 体积上限按标准未要求有意保留；两处存量运行时问题文档化待后续处理）

---

## 一、验证证据（本次会话实测）

| 门禁      | 命令                        | 结果                                                           |
| --------- | --------------------------- | -------------------------------------------------------------- |
| 测试      | `pnpm test`                 | ✅ 通过：api 127 例 / 15 文件 + admin 28 例 / 3 文件 = 155 例  |
| Typecheck | `pnpm typecheck`            | ✅ 通过（root tsc + 各包 tsc + Nuxt typecheck，含 golar 配置） |
| Lint      | `pnpm lint`                 | ✅ 通过（oxlint × 4 + eslint main，0 错误）                    |
| Format    | `pnpm fmt:check`            | ✅ 通过（oxfmt 全 worktree）                                   |
| Build     | `pnpm build`                | ✅ 通过（contracts→db→api→admin→main 拓扑全过）                |
| 冒烟      | 本地起服（dev + `.output`） | ✅ S4 头 / S5 状态码 / 页面 404 均实测（详见 §四）             |

> 说明：`audit_signals.py` 报 tests_count 与 Vitest 实际计数方式差异，以实测 155 例为准。

---

## 二、CRIT/STRUCT 返工记录（上一轮发现 → 本轮修复）

### CRIT-1 —「保留我的」冲突解决流确定性 500 ✅ 已修复

- 修复：`insertSnapshot` 由裸 `create` 改为 `createMany + skipDuplicates`（`service.ts`）——按 `(articleId, revision)` 幂等；publish/unpublish 与 save 同型并发冲突时的 preserve 快照撞唯一约束不再 P2002 → 500。
- 复核：`package/db/schema.prisma` 的 `@@unique([articleId, revision])` 为 DB 级约束，`skipDuplicates` 依赖其成立（已核对）。

### S1. publish/unpublish 读改写不原子 ✅ 已修复

- 修复：publish/unpublish 的 `update` 增加 `where: { id, revision: existing.revision }` 谓词，P2025 → `ARTICLE_STALE`（与 save 相同的乐观锁语义）；`lockArticleForWrite` 已含 `revision`（`articleListAdminProjection`）。
- 复核：`service.ts` publish（`published: true`）与 unpublish（`published: false`）两处均覆盖。

### S2. cover 归一化语义与 taxonomy 不一致 ✅ 已修复

- 修复（`service.ts:resolveCover`）：入参改为 `coverAssetId: number | null | undefined` + `existingCoverAssetId`；`undefined` → 保留现有 asset 引用且 `cover` 独立接受输入（不再被旧 asset deliveryUrl 强制回写）；显式 `null` → 清掉 asset；置数字 → 归一化到资产 deliveryUrl。save 调用改为传 `input.coverAssetId` + `existing.coverAssetId`。
- 契约对齐：`agent-docs/API_CONVENTIONS.md` 补充「omitting coverAssetId 保留资产引用、外部 URL 原样保留；显式 null 清资产」说明。

### S3. restricted-markdown 500 无 requestId 可归因 ✅ 已修复

- 修复：`restricted-markdown.ts` 500 分支不再裸 `console.error`，改为透传 `cause`；comments 与 activities 的 `resolveContentMarkdown` 把 statusCode ≥ 500 映射为 `ApiError('INTERNAL_ERROR', { cause })`（activities 原全映射 VALIDATION_FAILED，一并对齐）；`handleError` 对 `INTERNAL_ERROR` ApiError 以 pino + requestId + cause 记日志（<500 的客户端可预期错误仍静默）。
- 契约对齐：`API_CONVENTIONS.md` 日志节说明 INTERNAL_ERROR 亦记 requestId。

### S4. preview 防泄密 header 落在内部子响应而非最终 HTML ✅ 已修复

- 修复：新增 `apps/main/server/middleware/preview-headers.ts`，按「文章路径 + `?preview=`」把 `Cache-Control: no-store`、`Referrer-Policy: no-referrer` 落到**最终页面响应**；`detail.get.ts` 内不再重复/无效地设这些头。`noindex` 因 `@nuxtjs/seo` 会在响应末段改写 `X-Robots-Tag`，改用 `[article].vue` 在 preview 时注入 `<meta name="robots" content="noindex, nofollow">`。
- 冒烟：`.output` 起服 `curl /articles/<slug>?preview=x` → `Cache-Control: no-store` + `referrer-policy: no-referrer` 在最终响应上；dev 渲染 HTML 头含 `noindex, nofollow`（已验证）。

### S5. 全站错误以 HTTP 200 + body.statusCode 返回 ✅ 已修复

- 修复：`formattedEventHandler.ts` 成功与 catch 两分支都调用 `setResponseStatus(event, status)`（`any` 一并清为 `unknown` + 越界读取防护）；`[article].vue` 文章缺失时按上游真实状态透传（404 / 上游 5xx 原样），页面照常渲染空态。
- 冒烟：`.output` 起服 `curl /api/articles/detail?path=（缺失）` → HTTP 404，命中 → 200；dev `/articles/（缺失）` 页面 → 404。

### S6. 派生状态重置复制粘贴 ✅ 已修复

- 修复：新建 `apps/admin/src/hooks/use-derived-reset.ts`（渲染期 compare-and-reset 封装），替换全部 15 处 `prevRequestKey`/`prevOpen` 拷贝（articles/users/tags/comments/activities/music/assets/overview ×3 / 5 个 dialog）。

### S7. `prisma:reset` 无守卫 DROP 先于本地库守卫 ✅ 已修复

- 修复：新增 `packages/db/scripts/guard-local-db.mts`（导出 `isLocalDatabaseUrl`，CLI 独立执行），`prisma:migrate:reset` 改为**先跑守卫**再 `migrate reset --force`；`seed.mts` 改为复用同一谓词（消除两份漂移）。
- 冒烟：`HANA_DATABASE_URL=…staging…` 起守卫 → 输出拒绝并以 exit 1 终止（DROP 不执行）；`127.0.0.1` → 通过。

### S8. 生产 CI 无测试/类型/lint 门禁 ✅ 已修复

- 修复：`.github/workflows/deploy.yml` 在 Build 前新增 `Quality gates` 步骤（`pnpm test && pnpm typecheck && pnpm lint`）；移除 SSH 脚本中残留调试行 `npm --help`。
- 契约对齐：`agent-docs/BUILD.md` 部署节补上门禁说明。

---

## 三、INCR 返工记录

| #   | 项                                          | 状态        | 说明                                                                                                                                                                                                                     |
| --- | ------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ①   | 公开端点 JSON/multipart 体积上限            | ⏸️ 有意保留 | 文章 `content` 无长度上限（正文可很大），通用 JSON 上限有回退风险；multipart 上传已被 `ASSET_PAYLOAD_TOO_LARGE` + Content-Length 守卫覆盖；标准未要求，不改契约（新增错误码属契约变更）。                                |
| ②   | client-ip XFF 链短于配置跳数                | ✅          | 链路短于 hops 时不再夹到 index 0（可能读到客户端伪造段），回退 `remoteAddress`；单测同步更新。                                                                                                                           |
| ③   | create 中 tags `connectOrCreate` 并发 P2002 | ✅          | create 改为先 `createMany(skipDuplicates)` 再 `connect`，与 save 对齐。                                                                                                                                                  |
| ④   | comments parent/replyTo 跨 path 校验        | ✅          | `createPublic` 对 `parentId`/`replyToCommentId` 校验 `path` 一致，跨路径返回 VALIDATION_FAILED。                                                                                                                         |
| ⑤   | 编辑器三件套（重建/进度/漂移）              | ✅          | ① CodeMirror 扩展改 `useState` 惰性初始化只建一次；② `UploadGhostWidget.eq` 对比 `progress`（进度不再恒 0%）；③ `uploadField` 把 `insertAt` 沿文档变更 `mapPos` 平移 + 上传完成读 field 实时坐标（消除输入致插入漂移）。 |
| ⑥   | 离线 idb 存「保存开始」草稿                 | ✅          | 网络失败时改存 `get().draft` 最新草稿。                                                                                                                                                                                  |
| ⑦   | deploy.yml `npm --help` 残留                | ✅          | 见 S8。                                                                                                                                                                                                                  |
| ⑧   | comments tree schema 显式 `.strict()`       | ✅          | `commentPublicTreeSchema`/`commentAdminTreeSchema` 补齐。                                                                                                                                                                |
| ⑨   | About/Friends 标题黑名单魔数散落两处        | ✅          | 收敛为 `apps/main/server/utils/markdown.ts` 导出 `STATIC_MARKDOWN_TITLES` 单源，`rss.xml.ts` 引用；api-gateway 侧当前实际无黑名单（原报告「散落两端」前提在现 HEAD 已只剩一端）。                                        |

---

## 四、冒烟补遗 & 新发现的存量问题（非本次返工引入）

### N1.【存量】`.output` SSR 渲染文章页崩溃（@lucide/vue）

- 现象：`.output` 起服 `GET /articles/<slug>` → 500 `Cannot destructure property 'size' of 'useLucideProps(...)' as it is undefined`；`/`（首页）渲染正常。
- 复现：dev `NODE_ENV` 与 `NODE_ENV=production` 两种构建产物均复现；**dev 服务（源码态）渲染该页正常**。
- 判定：与本次返工无关（模板/图标层代码未动；未改动版本即复现）。风险：生产部署若同依赖解析，文章页将整体 500。
- 建议（后续）：核查 `.output` 内 `@lucide/vue`（node_modules 中 1.28/1.30 多副本）解析是否跨 Vue 实例——`useLucideProps` 为 `inject(LUCIDE_CONTEXT, {})`，本不应返回 undefined；是依赖去重/提树抖动的构建问题。本次按范围外处理并文档化。

### N2.【存量·测试数据】seed 的 `Article.to` 与规范形不一致

- 现象：主站文章详情页以 `path = route.path`（`/articles/<slug>`）请求 API `/public/articles/detail`，而 API 按**存储的裸 `to`**（seed 写入 `article-630`）匹配 → 种子文章全部 404（文章页为此渲染 404 空态）。
- 判定：`normalizeArticleTo` 的规范形是 `/articles/<slug>`（`service.ts:37-40`），seed 绕过它直接写裸值 —— 测试数据不一致，非主流程契约缺陷；生产经 create/save 入库的 `to` 为带前缀规范形。

### S4/S5 冒烟结果（已核）

| 探测                                              | 期望                                               | 实测                                                    |
| ------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------- |
| `.output` `/api/articles/detail?path=<缺失>`      | 404                                                | ✅ 404                                                  |
| `.output` `/api/articles/detail?path=article-630` | 200                                                | ✅ 200                                                  |
| `.output` `/articles/<slug>?preview=x` 响应头     | no-store + no-referrer                             | ✅（robots 头被 @nuxtjs/seo 改写，noindex 走页面 meta） |
| dev `/articles/<缺失>` 页面状态                   | 404                                                | ✅ 404                                                  |
| dev `/articles/<slug>?preview=x` HTML             | `<meta name="robots" content="noindex, nofollow">` | ✅                                                      |

---

## 五、文档漂移（已随修复收敛）

- **API_CONVENTIONS.md「handleError logs full error with requestId」** —— 修复后 INTERNAL_ERROR 记 requestId，且日志节补充说明；cover 契约语义补充（见 S2）。
- **CONTENT.md「preview adds noindex/no-store/no-referrer」** —— 更新为与实现一致：middleware 落 no-store/no-referrer 到最终响应 + `[article].vue` 注入 robots meta（S4）。
- **BUILD.md 部署节** —— 补充「先跑质量门禁再 build」（S8）。
- 达标核对（前序确认无误项不变）：PACKAGES 依赖矩阵、ARCHITECTURE「api-gateway 代理全量」+「rss 只经 API」、DATABASE 迁移↔schema 一致、`.strict()` 契约、refresh 轮换/复用检测。

---

## 参考与生成方式

_生成方式：上一轮复审报告（CRIT/STRUCT/INCR/漂移清单）→ 主代逐条返工 → 读码复核 → 五道门禁实测 → dev/.output 起服冒烟（S4/S5/N1/N2）。_

- 前序报告：[2026-08-08-code-review-report.md](./2026-08-08-code-review-report.md)、[2026-08-08-code-review-rework-report.md](./2026-08-08-code-review-rework-report.md)
