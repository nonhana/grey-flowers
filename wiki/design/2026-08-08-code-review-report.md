# Grey Flowers 全项目 Code Review Report（发布前）

- 日期：2026-08-08
- 分支：`feature/admin-monorepo` @ `c975492`（与 origin 同步，未落后）
- 审查范围：整个 monorepo（`apps/main`、`apps/api`、`apps/admin`、`packages/contracts`、`packages/db`、`wiki/`、`agent-docs/`、CI、根工具链）
- 方式：6 个并行只读评审（API / Admin / Main / Contracts+DB / 安全 / 架构）+ 审查者人工复核关键结论 + 静态门禁实测
- 目标：发布前 Code Review，聚焦 ① CODE_STYLE.md 合规（最高优先）② 代码质量/Bug ③ 过度实现 ④ 过长单文件

## 结论

项目整体工程质量**中上**，依赖脊柱与契约纪律很好，但存在 **2 个发布前必须修复的 CRIT** 和一批 **STRUCT 级缺陷与文档漂移**，且**自动化测试为零**。

**发布建议：先修复 CRIT，再处理 STRUCT 中的「邮件开关失效」「乐观锁失效」「迁移去重」三项，然后清理文档漂移。** 不阻塞发布的 INCR 可排期。

### 四轴评分

| 轴                     | 分       | 一句话                                                                                                 |
| ---------------------- | -------- | ------------------------------------------------------------------------------------------------------ |
| 架构 Architecture      | 8.0 / 10 | 包边界与依赖方向执行良好；残留`main→@grey-flowers/db`（仅 rss）+ 少量单一事实源重复                    |
| 代码质量 Code Quality  | 6.5 / 10 | 信封/契约/错误码纪律优秀，但乐观锁与邮件开关是真实缺陷，工具函数有重复                                 |
| 工程 Engineering       | 5.0 / 10 | `typecheck`/`lint` 全绿、供应链策略严格；但 **0 个测试文件**、文档大面积漂移、CI 步骤名与内容不符      |
| 性能与风险 Perf & Risk | 6.5 / 10 | 认证/上传/消毒核心面干净（无 SSRF、无提交密钥），但有 RSS 草稿泄漏（CRIT）、无登录限流、refresh 不轮换 |

**Overall：6.5 / 10**

---

## 一、验证证据（本次会话实测）

| 门禁      | 命令                    | 结果                                                                                |
| --------- | ----------------------- | ----------------------------------------------------------------------------------- |
| Typecheck | `pnpm typecheck`        | ✅ 通过（0 错误，含 Nuxt typecheck）                                                |
| Lint      | `pnpm lint`             | ✅ 通过（oxlint × 4 + eslint × 1，0 错误）                                          |
| Build     | `pnpm build`            | ✅ 通过（workspace 全量构建，含 Nitro`.output`，28.77s，`Build complete`）          |
| 测试      | —                       | ⚠️ 全仓库**0 个 `*.test.*`/`*.spec.*`**（git ls-files 验证；TESTING.md 已如实声明） |
| 密钥      | `git check-ignore .env` | ✅`.env` 已 gitignore，仓库仅跟踪 `.env.example`（占位符，无真实密钥）              |

---

## 二、CRIT（发布前必须修复）

### C1. RSS 泄漏未发布草稿元数据

- 位置：`apps/main/server/routes/rss.xml.ts:11-24`
- 问题：`prisma.article.findMany` 的 `select` 取了 title/to/description/publishedAt/cover/category/tags，但 **没有 `where: { published: true }`**，只在 JS 里按 `titleBlacklist = ['About','Friends']` 过滤。草稿（published:false，产品的内置工作流）的标题/摘要/标签/分类/封面全部进入公开 `/rss.xml`（不回显正文，但元数据全量泄漏）。
- 触发：任意一篇草稿存在即触发。对比 API 公开层 `articles/service.ts` 的 detail/list 均强制 `published: true`，此路径绕过产品约定。
- 修复：查询加 `where: { published: true }`，或直接改走 API 的 `apiGet('/public/articles/...')`（顺手清掉 main 最后一个 Prisma 直连点）。

### C2. 主站评论分页失效、切换文章不刷新

- 位置：`apps/main/app/components/comment/index.vue`
- 问题：`fetchComments`/`fetchTotal` 只在 `onMounted` 执行一次；`HanaPaginator v-model="page"` 改页后**没有任何 watch 触发重取** → 点第 2 页仍显示第 1 页。且 `queryPath`（按路由 path/fullPath 计算）无 watch，同一路由内切换文章时评论列表不刷新，会展示上一篇的评论。
- 复核：已人工确认脚本块内唯一 watch 是 `hash`（仅用于 `#comments` 滚动定位）。
- 修复：加 `watch(page, fetchComments)` 与 `watch(queryPath, () => { page=1; fetchTotal(); fetchComments() })`。

---

## 三、STRUCT（建议发布前修复）

### S1. 文章乐观锁「先查后改」非原子 → 并发保存静默丢更新

- `apps/api/src/modules/articles/service.ts:316,378`
- save() 先 `findUnique` 读 `revision`，比对 `expectedRevision` 抛 `ARTICLE_STALE`，随后 `article.update({ where: { id }, data: { revision: { increment: 1 } } })` —— update 的 `where` **没有 `revision` 谓词**。READ COMMITTED 下两个并发请求都读到 rev=5、都通过检查并各自提交，后者覆盖前者。乐观并发特性在其目标场景下失效。
- 修复：update 的 `where` 加 `revision: input.expectedRevision`，捕获 `P2025`/count 0 → `ARTICLE_STALE`（或 `updateMany` + 计数判断）。

### S2. 评论回复邮件开关环境变量键不匹配 → 邮件静默失效

- `apps/api/src/env.ts:54`、`apps/api/src/modules/comments/mailer.ts:23`
- API 的 env schema 读 **`MAIL_ENABLE`**（未设置 → 默认 `'false'`），但 `.env.example:17`、`deploy.yml:48`、`apps/main/server/env/index.ts` 全部下发 **`HANA_MAIL_ENABLE`**。`mailer.ts` 注释声称 `MAIL_ENABLE = HANA_MAIL_ENABLE === 'true'`，但代码无此映射。按文档配置后评论回复邮件永远不发。
- 修复：API 变量改名 `HANA_MAIL_ENABLE`（或补映射），修正两处误导注释；BUILD.md「Mail (main only)」同样改错（API 也消费）。

### S3. 迁移 `20260806120000_comment_moderation_fks` 去重被注释

- `packages/db/prisma/migrations/20260806120000_comment_moderation_fks/migration.sql:5-7,15-16`
- DELETE 去重语句整段注释，只留一个 `SELECT ... HAVING count(*)>1` 打印；随后**无条件** `CREATE UNIQUE INDEX UserMessage_receiverId_commentId_key`。若生产库已有重复 `(receiverId, commentId)` 行，`prisma migrate deploy` 会中断。
- 修复：执行 DELETE（每组保留最小 id）后再建索引，或在 DATABASE.md 写明手工前置步骤。

### S4. refresh 令牌不轮换、无重用检测（与文档矛盾）

- `apps/api/src/modules/auth/service.ts:160-170` vs `agent-docs/API_CONVENTIONS.md:40`
- `POST /auth/refresh` 只 `lastUsedAt` + 重签 access，**不轮换 refresh credential、不滑动过期**。API_CONVENTIONS 声称「rotates it」与事实不符。被盗 refresh cookie 可连续续命至固定 30 天。
- 修复：每次 refresh 轮换 secret 并吊销旧会话（检测重用），或将文档改实、加滑动过期。附注：access token 随每次请求回查会话吊销，缓解面可控。

### S5. `handleError` 丢弃未处理错误细节

- `apps/api/src/http/errors.ts:112-117`
- 未处理异常只 `process.stderr.write('Unhandled API error requestId=…')`，无 message/stack/cause；API_CONVENTIONS:60 声称「logged with requestId」但生产 500 不可调试。日志器本就注入在依赖图中。
- 修复：`dependencies.logger.error({ err: error, requestId }, 'unhandled error')`。

### S6. 受限 Markdown 消毒管道在 comments/activities 重复 ~85 行

- `apps/api/src/modules/comments/comment-markdown.ts` vs `apps/api/src/modules/activities/activity-markdown.ts`
- 两份几乎相同的 `defaultSchema`/tagNames/attributes/protocols/`validate*Ast`，仅 `clobberPrefix`、报错文案、excerpt/toc 取舍不同，且已出现漂移（一个保留 excerpt、一个丢弃）。
- 修复（CODE_STYLE #4）：抽 `apps/api/src/lib/restricted-markdown.ts`，入参 `{ clobberPrefix, banner }`。

### S7. 管理端 access token 存 localStorage

- `apps/admin/src/app/api/index.ts:32-43`
- token（TTL 15 分钟）明文放 `localStorage`，管理端任意 XSS（含第三方脚本）可窃取并直调全部 admin 接口，且服务端无按 token 的即时吊销窗口。
- 修复：access token 走 httpOnly + SameSite 会话（/auth 域 cookie 对齐），前端仅凭 refresh cookie 换取短命内存态令牌。

### S8. `/auth/*` 无速率限制

- `apps/api/src/app.ts`（全局无限流中间件）+ `modules/auth/routes.ts` login/register/refresh
- bcrypt cost 10 只拖慢不阻断；配合注册 CONFLICT 的账号枚举（`service.ts:88-95`，INCR）可定向爆破。
- 修复：挂 IP/账户维度限流（如 hono-rate-limiter + 失败计数衰减），`429`。

### S9. Admin 上传进度刻度不一致（0..100 vs 0..1）

- `apps/admin/src/app/api/http.ts:39,108,202`
- 契约注释 0..1；ky 分支传 0..100（:108）、XHR 上传分支传 0..1（:202）。当前真实上传全走 XHR 路径（唯一被跑通），ky 分支是潜在契约违约——未来任何走 `http.post(..., {body:FormData})` 的调用方都会在进度 50% 时显示 100%。
- 修复：ky 分支统一 `/ 100`。

### S10. 文章编辑器：冲突死路 + `flushNow` 静默失败 + save payload 三处重复组装

- `apps/admin/src/store/article-editor.ts`、`apps/admin/src/features/articles/workspace-page.tsx`
- ① 收到 `ARTICLE_STALE` 置 `phase:'conflict'` 后，服务端详情 `best-effort` 拉取失败 → `conflict` 恒 null → 顶栏只显示非可操作的「有冲突待处理」徽标，**解析对话框永不渲染**，且 autosave 只在下一次击键才重触发。
- ② `flushNow`（发布/打开主站门）在保存进行中时，`persist()` 因 `saving` 早退并置 `pendingAgain`，`flushNow` 读到 `phase==='saving'` 直接返回 false —— 在 1s autosave 窗口内点发布会**无任何反馈地取消动作**。
- ③ 同一份 save payload（alt/categoryId/content/cover/…/tags）在 `persist`/`resolveConflict`/`restoreVersion` 三处以略异键名组装（`preserveServerSnapshot` vs `createSnapshot` vs 无），加字段漏一处即产生此 store 想防的反射环类 bug。
- 修复：抽 `buildSavePayload(draft, overrides)` 单点；`flushNow` join 在途保存；冲突拉取失败时保留冲突态 + 显式重试。

### S11. Admin react-compiler 双 Babel 通道

- `apps/admin/vite.config.ts:21-26`
- 独立 `@rolldown/plugin-babel` + `reactCompilerPreset()` 叠加在 `@vitejs/plugin-react@6` 的 `react()` 之上；而 plugin-react 6 **自带** `babel-plugin-react-compiler@1.0.0` 且导出 `reactCompilerPreset`（已验证）。双通道 = 每个 .tsx 被转换两次，且不在官方支持路径上，靠「碰巧能跑」维持。
- 修复：走 `react()` 单通道（其支持的 compiler 配置），移除 standalone babel 插件，改后 `pnpm --filter @grey-flowers/admin build` 验证。

### S12. R2 删除顺序：先删对象后标 DB

- `apps/api/src/modules/assets/service.ts:361-366`
- `deleteObject` 先执行，DB 行后标 `DELETED`；若 DB 失败，对象已删而记录仍 `AVAILABLE` → 交付 URL 404。另 `PENDING_CLEANUP→remove` 的引用复查是更新前 TOCTOU（可恢复）。
- 修复：先标 `DELETED` 再删对象（对象删除失败才是可恢复侧）。

### S13. 预览 token 走 URL query

- `apps/api/src/modules/articles/routes.ts`（`GET /public/articles/preview`）+ `apps/main/server/api/articles/detail.get.ts:27-30`
- token 15 分钟、绑定 articleId+revision，落在 query → 进入访问日志 / Referer / 浏览器历史；持有者即可读整篇草稿全文（服务端刻意如此）。草稿预览链接被转发即泄漏全文。
- 修复：token 改放 fragment 或一次性短链；至少确保上游日志不记录 query。

### S14. main 迁移残留：死依赖 + 失效环境变量

- `apps/main/package.json`（resend、rehype-sanitize 无引用）、`apps/main/server/env/index.ts`（`RESEND_API_KEY`/`RESEND_FROM`/`HANA_MAIL_ENABLE` 仍为启动必需但 main 已不再消费）
- 迁移完成后 main 仅剩 `rss.xml.ts:11` 直连 Prisma（通过 `server/utils/prisma.ts`），其余 15 个 server/api 文件全部 `apiGet`/`apiMutate` 代理。
- 修复：rss 走 API → 从 main 移除 `@grey-flowers/db` 运行时依赖，删无用 env 要求与死依赖。

### S15. CI 步骤名与实际行为不符

- `.github/workflows/deploy.yml:47,68`
- Build 注入 `HANA_JWT_SECRET`——仓库全局 0 处读取（认证已迁至 `AUTH_ACCESS_TOKEN_SECRET`/`AUTH_REFRESH_TOKEN_PEPPER`）。SSH 步骤名为「Apply DB migrations and reload PM2」但脚本（:76-94）**没有任何迁移命令**，仅搬运产物 + PM2 reload。
- 修复：删除 `HANA_JWT_SECRET` 及废弃 GitHub secret；步骤改名「Deploy artifact and reload PM2」（或真正执行 `prisma migrate deploy`，有意不加则注明）。

---

## 四、INCR（不阻塞，排期）

- API：login 在会话创建事务外提前 revoke 旧 refresh（`auth/service.ts:135`，失败致静默登出）；logout 用 `process.stderr` 而非注入 logger；`monthRange` UTC vs 评论/oversight 本地时窗不一致（`articles/service.ts:200-203`）；`assets/deleteObject` 顺序见 S12；`contracts/auth.ts:156` `expiresIn: z.literal(900)` 硬编码与 `tokens.ts` 常量可能漂移。
- Admin：`uploadOne` 无 onabort、status===0 坠入 onload → JSON.parse 抛错误导（`http.ts:188-230`）；`ApiNetworkError`/`ApiResponseError` 文案是「身份服务…」却给所有端点复用（`app/api/errors.ts:7,14`）；`console-shell.tsx:4` `import cn from 'cnfast'` 默认导入 vs 全项目具名 `{ cn }`；上传「progress→commit asset→状态」编排在 5 处重复；`new-article-page.tsx:108,114` 文案称「自动转写为拼音」而 `suggestSlug` 只做小写化（无 pinyin 依赖）；`compose-page.tsx:242-247` 渲染期可变 Set 构建 `selectedAssetIds`。
- Main：`useDialog.ts` + `hana/Dialog.vue` 程序化对话框——OK 按钮恒渲染（死 `|| true`）、遮罩/Esc 关闭后 Promise 不 settle；`useZodVerify.ts` **零调用死代码且 `.format(callback)` 签名错误**；`Header/User.vue` loggedInMap/hanaMap 相同、命令按显示文本 switch；`prose/H1-H5` 五个文件逐字节相同（可并成一个组件按级渲染）；`scrollInWrapper.ts` 存在但 `getElementById('global-scroll-view-wrapper')` 在别处内联 4 次。
- DB/seed：`seed.mts` 缺「缺元数据」音乐行（artist/album 空串），导致 admin「缺元数据」筛选与 overview 的 missingMetadata 指标在种子数据上恒为 0；`Music.sourceAssetId Int?` 可空 vs 契约必填不对称未注释；`Comment` 无 `path/authorId/publishedAt` 索引（个人站规模可接受）；全文 `Article_search_document_idx` 只存在于 migration、schema.prisma 无标记（DATABASE.md 有提醒，建议加 schema 注释）；`contracts/overview.ts` rank name 无 `min(1)`；`contracts/comments.ts` 评论列表返回裸数组而非统一 `{items,...}` 分页信封（消费方特判）。
- seed 安全（STRUCT 边界的建议）：`seed.mts:55,60` 硬编码管理员口令且首步 `deleteMany` 清空全部表——若 `HANA_DATABASE_URL` 指向非测试库即灾难。建议：`NODE_ENV !== 'development'` 或非 localhost 目标直接退出，口令改注入。

---

## 五、专项结论（按用户四个关注点）

### 1. CODE_STYLE.md 合规 —— 总体良好，边界问题集中在「去重」

- ✅ **React-compiler 规则**：全 admin 仅 `article-editor.ts:432` 一处 `useMemo`（store 工厂幂等），**0 处 useCallback**；react-compiler 已正确启用（vite `reactCompilerPreset`）。此规则执行出色。
- ✅ **箭头函数**：`function` 声明仅出现在 CodeMirror 解析辅助（模块级纯函数，合理）；API 侧 `comment-markdown.ts:104`/`activity-markdown.ts:107` 仍用 `export async function` —— 轻微违例（INCR）。
- ✅ **契约纪律**：contracts 全部 `.strict()`、不泄漏 Prisma 类型；信封/错误码单一来源；`fields` 仅 VALIDATION_FAILED。
- ✅ **框架优先**：认证/上传/分页/消毒均用库能力，未重复造轮子。
- ⚠️ **「禁止重复工具」与「勿为单调用者抽象」**是重灾区：受限 Markdown 消毒管道 ×2（S6）、编辑 save payload ×3（S10）、MIME 接受清单 API↔admin（admin 内还再硬编码一份）、cover 归一化 API 内 ×3、上传编排 ×5、BottomSheet 两道近同 ~70 行、useFocusTrap/useDialog 与既有 hana 组件重叠。
- ⚠️ **推断优先的类型注解**：个别显式 `: ApiBody<T>` 后接 `as`（api-gateway.ts）、`readBody(event) as {...}`，轻微冗余（INCR，不逐个列）。

### 2. 代码质量 / BUG —— 见 CRIT/STRUCT；核心面干净

- 认证 JWT（HS256 单算法 + audience/issuer/requiredClaims/maxTokenAge + secret≥32B + 互异校验）、refresh HMAC(pepper)+timingSafeEqual、会话吊销覆盖 logout/改密/改角色、每次请求回查 DB —— 复核通过，无缺陷。
- 上传无路径遍历（文件名弃用、UUID key、魔数/ext 白名单、SVG 排除）、评论/动态 Markdown 消毒（rehype-sanitize + raw HTML 关闭 + href 白名单）——复核通过。
- 无 SSRF（全仓库无对用户可控 URL 的服务端 fetch）；无提交密钥。
- 真实缺陷集中在：RSS 草稿泄漏（C1）、评论分页（C2）、乐观锁（S1）、邮件开关（S2）。

### 3. 过度实现 —— 少量但明确

- `apps/admin` 声明 `hono` 依赖但 **0 处导入**（grep 验证；PACKAGES.md「AppType 被 admin 类型消费」已过时）。
- `apps/api` 导出 `AppType` 无使用者（可保留为类型便利，但文档别再声称被消费）。
- `apps/ui/charts.tsx` 4 个图元各仅 1 个调用者，却建成通用 `ui/` 层（并造成 603 行大文件）；`SidePanel` 单调用者。
- `apps/main`：`useHorizontalRail.ts` 343 行单调用者；`pinia-plugin-persistedstate` 已注册但无任何持久化 store；`useZodVerify.ts` 死代码。
- 已判合理不动的：`comments/service.ts`（420 行，树/回复/通知/邮件同一个事务流内聚）、`inspector-pane.tsx`（467 行）、`compose-page.tsx`（535 行）。

### 4. 过长单文件 —— 3 个建议动，其余合理

| 文件                                                                           | 行数    | 判定     | 建议                                                                                                                                                                               |
| ------------------------------------------------------------------------------ | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/src/modules/articles/service.ts`                                     | 1025    | 拆分合理 | 把搜索子系统（snippet heuristics + 排名 SQL + createSnippet，约 250 行）抽到`articles/search.ts`（同 preview-token/slug/wordcount 既有模式）；余下 ~775 行事务 CRUD 可辩护，别再拆 |
| `apps/admin/src/features/comments/list-page.tsx`                               | 633     | 机械拆分 | `CommentDatePicker`+`FilterControls`（~200 行）移出为 `filter-controls.tsx`；页面本体可辩护                                                                                        |
| `apps/admin/src/ui/charts.tsx`                                                 | 603     | 拆分     | 4 个图元各 1 调用者 → 拆到`ui/charts/` 一图一文件，或就近并入各 overview 卡片                                                                                                      |
| `apps/admin/src/features/activities/compose-page.tsx`                          | 535     | 合理     | 仅 resources 段（~125 行）可抽`ComposerResources`（可选）                                                                                                                          |
| `apps/admin/src/ui/overlay.tsx`                                                | 528     | 修重复   | 先消 BottomSheet 两道重复（~70 行），再议 SidePanel 单调用者                                                                                                                       |
| `apps/admin/src/store/article-editor.ts`                                       | 488     | 修重复   | 核心问题不是行数而是 save payload ×3（S10）                                                                                                                                        |
| `apps/admin/src/features/articles/editor/inspector-pane.tsx`                   | 467     | 合理     | VersionList（~85 行）可抽（可选）                                                                                                                                                  |
| `packages/db/scripts/seed.mts`                                                 | 1033    | 合理     | 数据种子的长度合理；补缺元数据音乐行（INCR）                                                                                                                                       |
| `apps/api/src/modules/activities/activity-markdown.ts` / `comments.service.ts` | 342/420 | 合理     | 大小可辩护；消毒管道去重见 S6                                                                                                                                                      |

---

## 六、文档漂移（agent-docs / wiki 与代码不一致）

> 全部为已核实的事实差异，多为迁移推进后文档未同步。**建议在发布前刷新，否则会误导后续维护与 AI 代理。**

**迁移状态（最重要，三份文档同错）：**

- `agent-docs/ARCHITECTURE.md:26` ——「slices 3-7 (music, activity, comments, users, overview) are still to be delivered」**假**：9 个 API 模块全部存在，7 个 admin 工作流全部交付（route-tree.tsx 含 overview/activities/comments/users/music/assets/articles/taxonomy）。
- `agent-docs/ARCHITECTURE.md:28-29` ——「main 仍直读直写 Prisma：server/api/activity/_、comments/_、user/_、auth/_、rss.xml」**假**：15 个 server/api 路由全部为 apiGet/apiMutate 代理（无 server/api/auth 目录），仅 `server/routes/rss.xml.ts` 读 Prisma。
- `agent-docs/ARCHITECTURE.md:41-45` —— API 模块列表仅 4 个 → 现有 9 个。
- `agent-docs/DATABASE.md:9`、`agent-docs/PACKAGES.md:36` —— 同一处 legacy 声明失效。

**版本/命令/事实：**

- `agent-docs/BUILD.md:5`、`PACKAGES.md:5`：pnpm `11.18.0` → 实际 `11.19.0`（root packageManager）。
- `agent-docs/BUILD.md:24`、`README.md:27`、`TESTING.md:19`：`pnpm dev` 不存在（root 无 `dev` 脚本，仅 `dev:main`）。要么补根脚本要么改文档。
- `agent-docs/BUILD.md:14`：「Mail (main only)」错——API 评论模块也消费 RESEND_* / MAIL_ENABLE（见 S2）。
- `agent-docs/BUILD.md:61`、`seed.mts:4`：「覆盖全部 13 张表」→ schema 现有 14 个模型（含隐式 _ArticleTags 为 15 张表）。
- `agent-docs/API_CONVENTIONS.md:40`：「refresh rotates it」假（见 S4）。
- `agent-docs/API_CONVENTIONS.md:51-55`：路由表缺 /activities、/comments、/music、/users、/overview 及四个 /public 组（app.ts 实际挂载 16 组）。
- `agent-docs/API_CONVENTIONS.md:60`：未处理错误「logged」言过其实（见 S5）。
- `agent-docs/CONTENT.md:29`：`apps/main/server/utils/comment-markdown.ts` 文件不存在——消毒管道在 `apps/api/src/modules/comments/comment-markdown.ts`。
- `agent-docs/PACKAGES.md`：AppType「consumed type-only by the admin」假（admin 无任何 hono/AppType 引用，hono 依赖未用）。
- `wiki/design/prisma-domain-model-reference.md:9`：「11 个模型 / 4 组枚举」→ 14 模型 / 5 枚举；`:181,186,300` Music.activityId 关联已由 20260804181723 迁移删除（现为 ActivityMusic M2M）；`:299` UserMessage→Comment 删除现为 `onDelete: Cascade`。
- `deploy.yml`：`HANA_JWT_SECRET` 死环境变量；「Apply DB migrations」步骤名不实（S15）。

---

## 七、Top 3 最高杠杆行动

1. **修 2 个 CRIT**（RSS 草稿泄漏 + 评论分页/刷新），并顺手把 rss 迁到 API → main 清掉最后一个 `@grey-flowers/db` 直连，删死依赖与死 env。
2. **修 3 个「静默失效」类 STRUCT**：乐观锁非原子（S1）、`HANA_MAIL_ENABLE` 键错（S2）、迁移去重被注释（S3）——三者都是「按文档/按设计该生效却没生效」，发布前必须清零。
3. **补最小自动化回归 + 刷新 agent-docs**：当前 0 测试是发布前最大工程短板；最低投入是给 API 信封/错误码、乐观锁、资产引用检查、受管 Markdown 消毒写若干 vitest 用例（跨工作区契约变更时跑 `pnpm build` 校验），同时按 § 六逐条刷新文档，避免代理与维护者被误导。

---

## 八、审查覆盖面与未覆盖

- 已覆盖：API 全部模块 + http/中间件/引导/适配器；admin 全部 features/ui/app-api/hooks/store/route-tree；main 全部 components/composables/stores/lib/pages/server（含 legacy server/api 15 个代理 + rss）；contracts 全部 9 个 schema；db schema/migrations/seed/生成策略；根工具链、CI、wiki 与 agent-docs。
- 特化评审：安全（认证/上传/消毒/CORS/SSRF/密钥）+ 架构（包边界/依赖方向/迁移债），已并入对应条目。
- 干净面（复核确认）：JWT/refresh 哈希与会话吊销、上传无路径遍历、评论/动态 Markdown 消毒、CORS/CSRF、无 SSRF、无提交密钥。
- 未深挖：`apps/admin` 音乐播放器内部（mini-player/player-bar/seek-row 等）与 `store/player.ts` 尾段未逐行；admin feature/*/display.ts 仅确认工具复用；`apps/api/dist/` 已提交产物未审查（建议确认是否该入库）；未在真实 DB 上执行迁移/种子演练（需连库，属发布流程步骤）。
- 本报告为只读评审，工作区未改动（除本文档本身）。

---

_生成方式：审计信号脚本 + 6 并行评审 + 人工复核 CRIT/高影响 STRUCT + `pnpm typecheck` / `pnpm lint` / `pnpm build` 实测。_
