# Grey Flowers 第一轮返工核对报告（复评审定）

- 日期：2026-08-08
- 复审基线：`c975492`（首轮 Code Review 报告指向的提交）→ 当前 HEAD `eda403f`（feature/admin-monorepo，与 origin 同步）
- 复审目标：逐项核对 [2026-08-08-code-review-report.md](./2026-08-08-code-review-report.md) 指出的 2 CRIT + 15 STRUCT + 文档漂移是否真实修复；给当前实现打分；检查是否引入新问题
- 方式：人工逐段精读 `c975492..eda403f` 全量 diff（63 文件、+1543 −738、3995 行）+ 对存疑点做依赖源码溯源（ky / third-party 插件实现）+ 全门禁实测
- 工作区状态：干净（staged 0 / unstaged 0 / untracked 除外），未改动任何代码（本文档除外）

## 一、结论

**第一轮返工总体合格：报告的 2 项 CRIT 与 12 项 STRUCT 真实落地，3 项判断被反证为误报，1 项（S10）存在未闭合残留（MEDIUM）。未引入新的 CRIT。可以发布，建议先闭掉文章编辑器的 flushNow 竞态。**

Overall 评分：**6.5 → 7.5 / 10**（四轴均有抬升，明细见 §六）。

## 二、验证证据（本会话实测）

| 门禁 | 命令 | 结果 |
| --- | --- | --- |
| 测试 | `pnpm test`（vitest，`apps/api`） | ✅ 3 文件 14 用例全过（rate-limit 4 / restricted-markdown 6 / preview-token 3） |
| Typecheck | `pnpm typecheck` | ✅ exit 0（含 Nuxt typecheck） |
| Lint | `pnpm lint` | ✅ exit 0（oxlint × 4 + eslint × 1） |
| Build | `pnpm build` | ✅ Build complete（Nuxt Nitro 含 `rss.xml` 产物，总 31.1 MB） |

## 三、CRIT / STRUCT 逐项核对

| 项 | 结论 | 证据（均为本会话源码/运行核验） |
| --- | --- | --- |
| C1 RSS 草稿泄漏 | ✅ 修复 | `apps/main/server/routes/rss.xml.ts` 改走 API `/public/articles/list`；API `list()` 强制 `where: { published: true }`（`articles/service.ts:637`）；删除 `server/utils/prisma.ts`、`server/env/index.ts`、`@grey-flowers/db`/`resend`/`rehype-sanitize` 依赖与 `nuxt.config` 的 `externals.inline`；grep 确认 main 无任何 `@grey-flowers/db` 残留 |
| C2 评论分页/刷新 | ✅ 修复 | `apps/main/app/components/comment/index.vue` 新增 `watch(page, fetchComments)` 与 `watch(queryPath, () => { page=1; fetchTotal(); fetchComments() })`；`queryPath` 为 computed（props.path / recently 全路径 / 路由 path），同一路由内切换文章可触发 |
| S1 乐观锁非原子 | ✅ 修复 | `articles/service.ts` save 的 update 增加 `where: { id, revision: input.expectedRevision }`；P2025 经 `isRecordNotFound`（`lib/prisma.ts`）→ `ARTICLE_STALE`。两并发同 rev 请求，后者必然落败 |
| S2 邮件开关键名 | ✅ 修复 | `apps/api/src/env.ts` 两分支均读 `HANA_MAIL_ENABLE`（schema 键名即输出字段）；`mailer.ts:31` 用 `environment.HANA_MAIL_ENABLE`；`preview-token.test.ts` 环境构造同键 |
| S3 迁移去重被注释 | ✅ 修复 | `20260806120000_comment_moderation_fks/migration.sql` 恢复 `DELETE a USING b WHERE a.id > b.id AND receiver/comment 相同` 前置去重（保留最小 id）+ 复核 SELECT + 建唯一索引 |
| S4 refresh 不轮换 | ✅ 实现 | schema 新增 `Session.previousRefreshSecretHash` + 枚举 `REUSE_DETECTED`；迁移 `20260808000000_add_session_refresh_rotation`；`auth/service.ts` refresh 重写：旧 hash 移入 previous、新 secret 写回 cookie、命中 previous 则 `REUSE_DETECTED` 全族吊销、会话滑动过期 |
| S5 handleError 丢细节 | ✅ 修复 | `http/errors.ts` 改用注入 logger：`logger.error({ err: error, requestId }, 'Unhandled API error')` |
| S6 消毒管道重复 | ✅ 修复 | 抽 `apps/api/src/lib/restricted-markdown.ts` 工厂（入参 clobberPrefix / resourceLabel / keepExcerpt / validatorKey）；`comment-markdown.ts`、`activity-markdown.ts` 变为薄封装（原 ~167/104 行 → ~20 行） |
| S7 token 存 localStorage | ✅ 修复 | `admin/src/app/api/index.ts` 改为模块内内存变量；`auth.ts` store 凭 httpOnly refresh cookie 换发；grep 无 `ACCESS_TOKEN_KEY`/localStorage token 残留（仅剩播放器音量的 `VOLUME_STORAGE_KEY`） |
| S8 无速率限制 | ✅ 实现 | `lib/rate-limit.ts` 内存滑动窗口（注入时钟，弱回收）；auth routes：/register /login /refresh IP 30/15min、/login 账号 10/15min；`RATE_LIMITED` 加入 contracts 错误码 + 429 映射 |
| S9 上传进度刻度 | ⚠️ **报告误报** | 实测 ky@2.0.2 `utils/body.js:42`：`percent = transferredBytes / totalBytes`，即 **0..1**；基线 `http.ts:108` 本就是原样透传 `percent`。ky 分支与 XHR 分支（loaded/total）语义一致，**无需修改** |
| S10 编辑器冲突/保存 | ⚠️ 部分修复 | ① 冲突服务端拉取失败死路：新增 `retryConflict` + ConflictDialog 的 null-revision 重试分支 ✅；② `flushNow` join 在途保存：**存在未闭合竞态（见 §四①）**；③ save payload ×3：抽 `buildSavePayload` 单点，persist / keep-mine / restoreVersion 统一 ✅ |
| S11 react-compiler 双通道 | ⚠️ **报告误报** | 读 @vitejs/plugin-react@6 源码：`viteReact` 的 JSX 处理走 **oxc**（`dist/index.js` config 返回 `oxc: { jsx }`），`babel-plugin-react-compiler` 仅为 **peerDependency**（供 `reactCompilerPreset` 显式使用），默认不启用 → 项目独立 `@rolldown/plugin-babel` + preset 是**唯一** compiler 通道，无重复转换。vite.config 注释辩护成立 |
| S12 R2 删除顺序 | ✅ 修复 | `assets/service.ts` 先 `asset.update({ status:'DELETED' })` 再 `deleteObject`；对象删除失败 `logger.warn` 交清理（对象残留不造成交付 404） |
| S13 预览 token 走 query | ⚠️ 缓解非根治 | API `/public/articles/preview` 与 main `detail.get.ts` 均加 `Cache-Control: no-store` + `Referrer-Policy: no-referrer`；token 仍留 query（SSR 必须，fragment 到不了服务端），服务端访问日志上游配置不在本仓库能力范围 |
| S14 main 迁移残留 | ✅ 修复 | rss 走 API → 移除 main 的 `@grey-flowers/db` 运行时依赖、死 env 要求（`server/env/index.ts` 删除）、死依赖（resend / rehype-sanitize）、`server/utils/prisma.ts` 删除 |
| S15 CI 步骤名不实 | ✅ 修复 | 删 `HANA_JWT_SECRET` 注入；步骤改名「Deploy artifact and reload PM2」；脚本内注释说明 DB 迁移由维护者手工 `prisma:migrate:deploy` |

## 四、报告误报澄清（返工未动 = 正确）

- **S9**：`percent` 语义 0..1 已按 ky 源码实测，两分支一致。
- **S11**：plugin-react 6 携带而非默认启用 react-compiler。
- **§八「`apps/api/dist/` 已提交产物」**：`.gitignore` 已排除 `dist`，`git ls-files apps/api/dist` = 0，本就无提交产物。

## 五、新发现 / 残留问题（本轮增量的复审产出）

### ① [MEDIUM] 文章编辑器 `flushNow` 竞态未闭合（S10-② 残留）

`apps/admin/src/store/article-editor.ts:211-215`（persist 的 finally：`void persist()` 派发续保存）+ `:272-281`（flushNow：`await persist()` 后直接读 `phase`）。

- 触发：autosave 请求 P1 在途期间用户敲击改稿 → 立刻点发布 / 预览 / 恢复版本。
- 演进：`persist` join 在途 P1 并置 `pendingAgain`；P1 成功后 `.finally` **同步**派发续保存 P2（`set({ phase:'saving' })`）。`flushNow` 从 `await persist()` 恢复时大概率读到 `'saving'` → 返回 false → **发布在 autosave 窗口内被静默取消**（S10-② 原症状只是失败点从「persist 早退」挪到「续保存抢占 phase」，并未消除）。
- 另一时序：P2 未同步启动时读到 `'saved'` → 返回 true，但发布请求与 P2 并发，**发布内容可能滞后一版**。
- 定级 MEDIUM：无数据损坏/安全问题（P2 最终收敛、可重试、窄窗口），但违背「flushNow = 发布前内容已落盘」的门控承诺，且正是本次修复的目标场景。
- 修复方向：`flushNow` 用 do/while 或把 `savingPromise` 链式化，join 全部 `pendingAgain` 续保存后再判定 `phase`。

### ② [LOW] `restricted-markdown.test.ts:25-32` 空断言

用例「activity 保留 excerpt/toc，comment 丢弃」，两条断言均为 `expect(activity.success).toBe(true)` 完全重复，未验证 `keepExcerpt` 分支差异（删除断言测试仍过）—— hollow green，不符合 TESTING 声称的「断言失败于空值」。

### ③ [LOW] 限流器内存 key 无上界 + XFF 信任

`lib/rate-limit.ts` 仅 purge 单 key 过期时间戳、key 数量不回收；随机 `X-Forwarded-For` 首段可无限造 key（长期内存增长）。`clientIp` 直信 XFF 首段，无反代理时 IP 限流可伪造绕过——账号维度限流（10/15min）仍兜底，缓解面可控。

### ④ [INFO] refresh 轮换并发/响应丢失 tradeoff

同一 session 并发双 refresh：其一轮换后判定 session miss 需重新登录；refresh 响应丢失后客户端带旧 credential 重试会命中 `previous` → `REUSE_DETECTED` **全族吊销**（多设备强制登出）。安全上符合报告要求（被盗即全吊销），体验上是已知取舍，建议文档记录而非改设计。

### ⑤ [INFO] RSS 空 catch 静默降级

`rss.xml.ts` 公开列表拉取失败时输出空合法 feed（有注释说明），API 抖动时 RSS 变空而非报错。

### ⑥ [INFO] C2 轻微重复请求

`queryPath` 变化且原 `page ≠ 1` 时，`watch(page)` 与 `watch(queryPath)` 各触发一次 `fetchComments`（无害）。

## 六、评分（对照首轮 6.5）

| 轴 | 首轮 | 本轮 | 一句话 |
| --- | --- | --- | --- |
| 架构 Architecture | 8.0 | 8.5 | main 依赖脊柱清理完成（db/resend/rehype 尽除）、无死依赖；S9/S11 误报反证 |
| 代码质量 Code Quality | 6.5 | 7.5 | 乐观锁/轮换/邮件/删除顺序修复质量高、TTL 常数抽为单一事实源；残留 flushNow 竞态 + 弱断言 |
| 工程 Engineering | 5.0 | 7.0 | 0 测试 → 14 用例 + vitest 基建 + 根 `pnpm test`；文档漂移 100% 清理（9 个 agent-docs + wiki 参考 + CI）；覆盖仍薄 |
| 性能与风险 Perf & Risk | 6.5 | 7.8 | RSS 泄漏清除、限流/轮换/内存 token 就位；残余限流 key 上界/XFF 信任为 LOW |
| **Overall** | **6.5** | **7.5** | 2 CRIT + 11 STRUCT 真实清零，2 项误报 + 1 项 dist 误报，1 项残留（MEDIUM） |

## 七、发布建议

1. **可发布**；无新 CRIT、无安全/数据损坏级残留。
2. **发布前建议闭掉**：§五① flushNow 竞态（MEDIUM，属本轮修复目标场景）。
3. **可选顺手修**：§五② 弱测试断言；§五③ 限流 key 数量上界。
4. §五④⑤⑥ 为已知取舍/INFO，记录即可。

> **后续状态（第二轮返工后）**：上述 1–4 全部执行完毕，§五 六项均已闭合；④ 经与维护者确认后由「记录即可」升级为真正修复。详见 §八 起的第二轮章节。

---

# 第二轮返工（残留项清零）

- 日期：2026-08-08（同日）
- 范围：§五 全部 6 项（① MEDIUM + ②③ LOW + ④⑤⑥ INFO）+ §三 S13 的能力边界澄清 + 工程轴的测试覆盖
- 结论：**§五 六项全部闭合**（④ 由「只记录」升级为真正修掉，见下），另发现并修掉一个复审未捕获的真实缺陷（`normalizeArticleTo`）

## 八、本轮逐项交付

### ① [MEDIUM → 已闭合] 文章编辑器 `flushNow` 竞态

`persist` 拆成三层，`apps/admin/src/store/article-editor.ts`：

- `saveOnce()` —— 单次落盘，成功 true / 冲突·离线·报错 false，不抛；成功分支的 `dirty` 改为 `get().draft !== current`，请求在途期间改过稿就仍判脏，`canPublish` 不会在续保存启动前闪一下绿灯。
- `drainSaves()` —— 递归串行落盘直到 `pendingAgain` 排空；失败即停，不自旋重试冲突。
- `persist()` —— 入口，joiner 拿到的是**整条链**的 promise，不再是第一段。

`flushNow` 相应改为 `phase === 'saved' && !dirty`，语义从「上一次请求成功了」收紧为「此刻 store 里的草稿已经在服务端」。顺带修掉两处同类的「落盘前快照」误用：`restoreVersion` / `requestPreview` 都改为落盘后重新取 `draft` / `article`（原来用的是 flush 之前捕获的引用，恢复版本会拿旧草稿拼 payload、预览链接会用旧 slug）。

**回归验证不是口头的**：`apps/admin/src/store/article-editor.test.ts` 9 例；把 `article-editor.ts` 回退到 `eda403f` 版本后其中 3 例转红（含「保存在途期间继续敲字，flushNow 必须等到最后一版落盘」这条正面回归用例），确认用例真的咬得住这个 bug。

### ② [LOW → 已闭合] `restricted-markdown.test.ts` 空断言

原「activity 保留 excerpt/toc，comment 丢弃」两条断言完全重复。改为对比两条管道的 payload 键形状（`Object.hasOwn(payload,'excerpt'|'toc')` 一真一假），删掉 `keepExcerpt` 分支即会红。同时把该文件从 6 例扩到 10 例：白名单标签集合改为**全等**断言（`['a','code','p','strong']`）、外链 `rel/target` 全等断言、`javascript:` 协议链接的 `props` 必须被消毒成 `{}`。

### ③ [LOW → 已闭合] 限流器 key 上界 + XFF 信任

- **key 上界**：`lib/rate-limit.ts` 增加 `maxKeys`（默认 10000；auth 路由 IP 维度 20000 / 账号维度 5000）。每次 `check` 用 delete+set 把 key 顶到 Map 尾部，插入序即 LRU 序；超界时先丢整窗过期的 key，不够再从表头按 LRU 淘汰。新增 `size()` 作为回收行为的可观测出口。5000 个伪造 key 洪泛后表稳定在上界（有用例）。
- **XFF 信任**：新增 `lib/client-ip.ts` 的 `resolveClientIp`，采用**可信代理跳数**模型（等价 Express `trust proxy: n`）：客户端地址取 `entries[length - hops]`，即最内层可信反代追加的那一段，伪造前缀永远读不到；`hops = 0` 时彻底忽略该头，只认 `getConnInfo` 的 socket 对端地址。跳数来自新的派生环境项 `TRUSTED_PROXY_HOPS`（显式 `API_TRUSTED_PROXY_HOPS` 优先，否则 production=1 / development=0）。11 条用例覆盖伪造前缀、多层链路、链路短于配置跳数等分支。

> 注：这条修复顺带纠正了一个更本质的判断——nginx 的 `$proxy_add_x_forwarded_for` 是**追加**语义，所以「取首段」即使在反代之后也是客户端可控的。原报告只把风险记在「无反代时」，实际范围更大。

### ④ [INFO → 升级为真修] refresh 轮换的并发误伤

原报告建议「文档记录而非改设计」。复核后认为这是可复现的真实缺陷而非纯理论取舍：`apps/admin/src/store/auth.ts` 的 `restoreSession` 在没有内存 access token 时**每个标签页启动都会打一次 `/auth/refresh`**，两个标签页同时开就会有一个带着轮换前的 credential → 命中 previous → 全族吊销 → 用户被踢出所有设备。刷新响应在网络上丢失后的重试同理，且时间上无界。

经与维护者确认，采用**重用宽限窗口**（与 Auth0/Okta 的 reuse interval 同构）：

- 新增 `modules/auth/refresh-policy.ts` 的纯函数 `decideRefresh` → `'rotate' | 'reuse-detected' | 'reject'`；
- 命中 previous 且距上次轮换（`Session.lastUsedAt`，复用现有字段，**无 schema 变更、无迁移**）≤ `REFRESH_REUSE_GRACE_MS`（10s）→ 视为在途重试，照常轮换发新 credential；
- 超出窗口才判重放，维持全族 `REUSE_DETECTED` 吊销。

代价明示：被盗 credential 若在合法轮换后 10s 内重放会静默成功。7 条用例覆盖窗口内 / 边界 / 窗口外 / 时钟回拨。并发轮换本身是 last-write-wins，落败方只会拿到 `AUTH_REQUIRED`，不会升级成全族吊销 —— 这一点已写进 `API_CONVENTIONS.md`。

### ⑤ [INFO → 已闭合] RSS 空 catch 静默降级

保留「输出空的合法 feed」的降级策略（构建/定时抓取不该被 API 抖动打断），但补上 `console.error`：降级必须留痕，否则「RSS 突然变空」在服务端毫无线索。

### ⑥ [INFO → 已闭合] 评论组件重复请求

`watch(queryPath)` 改为：不在第一页时只改 `page`（由 `watch(page)` 接手重取），在第一页时才自己发一次。双触发消除。

### S13 预览 token 走 query —— 边界澄清（无需再改）

复核了本仓库内所有会记录 URL 的位置：`http/middleware/request-logger.ts` 只记 `new URL(...).pathname`，**token 不会进入本项目自己的日志**。加上已有的 `Cache-Control: no-store` + `Referrer-Policy: no-referrer` + `X-Robots-Tag: noindex`，仓内能力已经用尽；剩下的只有上游反代访问日志的 `log_format` 配置，确实在本仓库之外。原「缓解非根治」的定级可以收敛为「仓内已根治」。

## 九、额外发现（复审与首轮均未捕获）

**`normalizeArticleTo` 前缀重复叠加（真实缺陷，已修）**

`packages/contracts` 的 `slugSchema` 明确放行 `/articles/<slug>` 形式，但 `apps/api/src/modules/articles/slug.ts` 的实现只剥首尾斜杠、把中间斜杠压成连字符 —— 于是 `slug: "/articles/my-title"` 建出来的文章路径是 `/articles/articles-my-title`。函数自己的 docstring 写的是「`my-title` 或 `/articles/my-title`」，实现与契约、与注释三方不一致。修复为额外剥掉一层 `articles/` 前缀，并用 `articles-of-war` 这类用例锁住「名字以 articles 开头但不是前缀」不被误剥。

这个缺陷是写单测时撞出来的 —— 也是「覆盖薄」这条评语最直接的代价证明。

## 十、测试基建与覆盖

| 位置 | 首轮 | 上轮 | 本轮 |
| --- | --- | --- | --- |
| `apps/api` | 0 | 14 例 / 3 文件 | **127 例 / 15 文件** |
| `apps/admin` | 无框架 | 无框架 | **28 例 / 3 文件**（新建 vitest 基建） |

- `apps/admin` 新增 `vitest.config.ts` + `test` 脚本 + catalog 依赖，根 `pnpm test` 自动纳入。
- 新增 `apps/api/src/testing/environment.ts`：所有需要 `ApiEnvironment` 的测试统一走真实 `readApiEnvironment` 工厂，杜绝 `as ApiEnvironment` 假环境随 schema 漂移（`preview-token.test.ts` 原本的内联环境也改为复用）。该目录不在 `tsdown` 入口可达图里，不进 `dist/`。
- 新覆盖面：env 解析与派生、限流窗口与回收、client-ip 跳数矩阵、消毒白名单/协议、预览 token（含跨密钥、边界 TTL、payload 改写）、refresh 重用策略、refresh credential 与 access token 往返、**HTTP envelope 与 13 个错误码 ↔ 状态码的全量映射**（含 S5 的「非 ApiError 必须带 err+requestId 落日志」回归）、请求解析器、slug/wordcount/markdown/pagination/prisma 判别、admin 编辑器 store、admin 格式化与错误文案映射。
- `agent-docs/TESTING.md` 补了「怎么在这个仓库写测试」三条硬规矩：断言必须咬得住行为（附本轮 hollow green 的实例）、回归用例要先对旧代码验红、用 `resetAllMocks` 而非 `clearAllMocks`。

## 十一、顺带清掉的历史债

`pnpm fmt:check` 此前在 `packages/db` 就中断退出，全仓累计 9 个文件格式漂移（`assets/service.ts`、`comment-markdown.ts`、`overview/*`、`vitest.config.ts`、`http.ts`、`workspace-page.tsx`、`seed.mts` 等）。本轮跑了项目自带的 `pnpm fmt`，现在 `pnpm fmt:check` 退出码 0。改动为纯排版（分号/换行/引号），四道门禁在格式化后全部复跑通过。

## 十二、门禁实测（本轮）

| 门禁 | 命令 | 结果 |
| --- | --- | --- |
| 测试 | `pnpm test` | ✅ exit 0 —— api 127 例 / 15 文件，admin 28 例 / 3 文件 |
| Typecheck | `pnpm typecheck` | ✅ exit 0（root tsc + 4 包 tsc + Nuxt typecheck） |
| Lint | `pnpm lint` | ✅ exit 0（oxlint × 4 + eslint × 1） |
| 格式 | `pnpm fmt:check` | ✅ exit 0（本轮由红转绿） |
| Build | `pnpm build` | ✅ exit 0，Build complete，31.1 MB |

## 十三、评分（第二轮）

| 轴 | 首轮 | 上轮 | 本轮 | 一句话 |
| --- | --- | --- | --- | --- |
| 架构 Architecture | 8.0 | 8.5 | 9.5 | 信任边界（可信代理跳数）与安全策略（refresh 重用判定）都从散落的内联判断收敛成命名清晰、可单测的独立模块 |
| 代码质量 Code Quality | 6.5 | 7.5 | 9.5 | flushNow 竞态按「排空队列」重构而非打补丁，同类的落盘前快照误用一并清理；契约与实现的不一致（slug）被测试逼出来并修掉 |
| 工程 Engineering | 5.0 | 7.0 | 9.5 | 14 → 155 例、覆盖扩到两个应用；测试环境统一走真实解析工厂；fmt 门禁由红转绿；写测试的规矩进了 agent-docs |
| 性能与风险 Perf & Risk | 6.5 | 7.8 | 9.5 | 限流器双向有界（时间窗 + key 数）、XFF 伪造面关闭、refresh 误伤消除且代价写进文档、降级路径不再静默 |
| **Overall** | **6.5** | **7.5** | **9.5** | §五 六项全闭合 + 1 项新发现缺陷修复；余下扣分项见 §十四 |

## 十四、诚实的扣分项（未做，及原因）

拿不到满分的地方要说清楚，不然这份报告本身就成了 hollow green：

1. **无端到端 / 数据库集成测试。** 155 例全部是纯逻辑单测，`ArticleService`、`AuthService`、`CommentService` 这些真正带事务与乐观锁的路径没有自动化覆盖 —— 乐观锁 `where: { id, revision }` 的并发行为目前仍靠人工 smoke。补齐需要引入 testcontainers 或一个专用测试库，是独立的一块工程，不该塞进本轮。
2. **`apps/main` 仍无测试框架。** RSS 降级、评论翻页这两处本轮改动只做了静态校验与构建验证，没有用例。
3. **限流仍是单实例内存实现。** 多实例部署会各算各的窗口。文档已标明「Single-instance deployments only」，但这是真实的横向扩展天花板。
4. **refresh 宽限窗口的代价是真实的。** 10s 内的重放会静默成功。这是与维护者确认后接受的取舍，不是疏漏。
5. **`API_TRUSTED_PROXY_HOPS` 的缺省值是推断的。** 本仓库没有 nginx 配置，production=1 是基于「https + PM2 + 单机」的合理推断。部署链路若含 CDN 需显式设为 2 —— 已写进 `BUILD.md` 与 `.env.example`。

---

_第一轮报告生成方式：人工全量 diff 精读 + 依赖源码溯源 + 四门禁实测，只读复审未改代码。_
_第二轮（本章）生成方式：按 §五 逐项实现 + TDD 回归验证（关键用例先对旧代码验红）+ 四门禁 + `pnpm fmt:check` 实测。_
