# Grey Flowers Admin Effect / Callback 返工执行计划（SSOT）

> 状态：已实施（2026-08-30，Slice 1–8 全部完成并通过验收清单）  
> 基线：`master` / `6faeed60c00f37e3e1e1d47adfd8b73112376cfa`  
> 权限边界：本文件是本轮唯一写入；产品代码、配置、依赖和锁文件均未开始修改。

## Agreed outcome

### Goal

- 将 Admin 的服务器状态统一交给 TanStack Query 管理，删除页面内重复的 `data/loading/error → load → reload → fetchSeq → useEffect` 请求状态机。
- 将用户事件触发的刷新改为显式 mutation 成功处理和精确 query invalidation；不再通过 state 变化间接唤醒 Effect。
- 将 `useCallback` 从当前 27 个调用点收敛到 0；React Compiler 负责普通函数身份优化，除非后续出现可证明的第三方稳定身份契约，否则不得恢复手工 callback memoization。
- 将 `useEffect` 从当前 40 个源码调用点收敛到不超过 12 个；保留项必须明确同步浏览器、DOM、PWA、CodeMirror、计时器、对象 URL、全局事件或文章编辑器远端持久化等外部系统。
- 删除 `useDerivedReset`、`reloadKey`、`fetchSeq` 以及服务器数据对应的页面级 `data/loading/error` state。

### Constraints and invariants

- 新增 `@tanstack/react-query@^5.102.8`，通过 workspace `catalogs.admin` 管理版本；不引入 Query Devtools、React Testing Library、jsdom、MSW 或第二套请求客户端。
- `apiClient` 继续是唯一浏览器 HTTP adapter；Query 只负责编排服务器状态，不复制 contracts 校验、认证续期、错误映射或业务规则。
- Zustand 继续只承载认证、播放器和文章编辑器等长生命周期客户端工作流；不得把普通列表、详情或 overview 数据迁入 Zustand。
- `apps/api` 仍是唯一业务操作入口，Admin 不新增 Prisma、数据库或服务端业务逻辑。
- QueryClient 初始默认值固定为：query `retry: false`、mutation `retry: false`、`refetchOnWindowFocus: false`、`staleTime: 0`；不启用 polling、持久化 cache 或自动全局 mutation invalidation。
- 为保持现有视觉契约，任何主动 refetch、筛选变化、分页变化和 mutation 后刷新都继续显示当前骨架/加载态；不得借本重构顺带改成 stale-data/keep-previous-data UX。
- 所有 query function 必须消费 TanStack Query 提供的 `AbortSignal`；取消不得转换成用户可见的网络错误。
- 共享 refresh-token 请求不得绑定到某一个 query 的 signal；单个 query 在 refresh 完成前已取消时，必须跳过该 query 的重试。
- 会话过期、登出、切换账号和非 ADMIN 账号拒绝路径必须清空 Query cache，防止上一个主体的数据留在内存或下一次登录界面。
- mutations 不做 optimistic update。成功后先更新可由响应精确更新的 detail cache，再 `await` 受影响的 query invalidation；失败时保持现有中文错误、toast 和表单草稿。
- 现有 TanStack Router 路径、search 参数、懒路由和页面可深链行为保持不变。
- 现有文章编辑器 autosave、离线恢复、冲突处理、版本恢复和 `flushNow` 语义保持不变；`useArticleEditor` 的 store 工厂 `useMemo` 与挂载后 reload Effect 是明确保留项。
- 每个切片必须可独立停止：完整通过其 checkpoint 后，即使后续切片不实施，仓库仍可运行、构建和部署。
- 当前工作区已有 26 个暂存 Admin 文件，它们是本计划的输入基线。实施时不得 reset、checkout、stash、clean 或覆盖这些变更。

### Non-goals

- 不改 API endpoint、DTO、contracts、Prisma schema、migration、R2 对象或生产数据。
- 不把列表筛选、搜索和分页迁入 URL，也不新增 Router loader/prefetch；现有 search 参数只按当前行为保留。
- 不把文章编辑器 store 改造成 TanStack Query，不改变 autosave 或草稿 SSOT。
- 不引入 optimistic update、离线 Query cache、focus refetch、polling、SSR/hydration 或 persistent query client。
- 不重做页面布局、骨架、错误文案、toast、空态、颜色模式、动画或响应式设计。
- 不为达到数字目标删除合法 Effect；若最终超过 12 个，必须逐项记录外部系统、保留理由和验证证据，而不是静默放宽标准。

## Current-state evidence

- `apps/admin/package.json:8` — Admin 已有独立 `fmt:check`、`lint`、`typecheck`、`test`、`build` 命令；依赖中只有 TanStack Router，没有 TanStack Query。
- `pnpm-workspace.yaml:47` — Admin 依赖统一放在 `catalogs.admin`；TanStack Query 必须从这里进入，而不是直接写散版本。
- `agent-docs/CODE_STYLE.md:21` — 仓库明确要求 React Compiler 最佳实践，并禁止无必要的 `useCallback` / `useMemo`。
- `apps/admin/src/features/overview/overview-page.tsx:38` — Overview 以本地 `data/loading/error`、`fetchSeq`、两个 `useCallback` 和一个 Effect 管理一次普通 GET，是当前重复模板的最小代表。
- `apps/admin/src/features/activities/list-page.tsx:56` — 列表页同时维护输入值、debounced 值、页码、请求状态、render-time reset、请求序号和 reload callback；该形状在 articles、music、comments、users 等页面重复。
- `apps/admin/src/features/assets/list-page.tsx:151` — request key 使用 `JSON.stringify`，请求生命周期靠 `fetchSeq` 裁决；`apps/admin/src/features/assets/list-page.tsx:341` 在上传后同时清筛选并直接 reload，会先按旧闭包请求、再按新条件请求。
- `apps/admin/src/hooks/use-derived-reset.ts:3` — 通用 Hook 在 render 期比较并调用任意 reset callback；服务器请求状态迁移后它不再有合法用途，表单重置改由 keyed inner module 负责。
- `apps/admin/src/app/api/http.ts:24` — `HttpRequestOptions` 明确排除了 `signal`，当前 ky 请求、调试延迟和认证重试链无法消费 Query cancellation。
- `apps/admin/src/app/api/http.ts:75` — 所有请求在 transport 内统一处理鉴权、调试延迟、ky、envelope 校验和错误映射；AbortSignal 必须在这一现有 seam 内扩展，不能绕开它直接 fetch。
- `apps/admin/src/app/providers.tsx:12` — 认证恢复与 session-expired handler 注册由组件挂载 Effect 启动；这是 app bootstrap，不应依赖 Provider 是否被 React 挂载两次。
- `apps/admin/src/main.tsx:14` — 当前入口只验证 root 并 render，可承接同步 handler 注册和一次性 session restore 启动。
- `apps/admin/src/store/auth.ts:62` — 会话过期、禁止访问、登出和切换账号目前只清 access token / auth state；引入 Query cache 后这些路径都必须加入 cache 清理。
- `apps/admin/src/hooks/use-keyboard-inset.ts:8` — `visualViewport` 是浏览器可变外部 store，适合改用 `useSyncExternalStore`。
- `apps/admin/src/hooks/use-paste-files.ts:11` — 一个 Effect 只为同步最新 callback ref，另一个 Effect 才负责真实 document subscription；可用 `useEffectEvent` 收敛为一个订阅 Effect。
- `apps/admin/src/features/music/player/now-playing-sheet.tsx:78` — Effect 用 track state 反向写父级 open state；目标模型改为 `openTrackId` 后可纯派生可见性。
- `apps/admin/src/app/shell/console-rail.tsx:247` — Effect 只把 `size` 镜像到 ref，原因是 resize 模块没有在结束回调中返回最终尺寸；应深化 `useResizableEdge` 接口而不是保留镜像。
- `apps/admin/src/app/pwa.tsx:5` — PWA ready/update 状态同步到 toast 和 service worker，是保留 Effect 的正例。
- `apps/admin/src/features/articles/editor/code-mirror-pane.tsx:72` — 将 React handler 注册到 CodeMirror 模块级槽位并在卸载时清理，是保留 Effect 的正例。
- `apps/admin/src/routes/route-tree.tsx:15` — 现有页面均通过 TanStack Router 懒加载；本计划不改 route ownership 或 URL 行为。
- `apps/admin/vitest.config.ts:10` — Admin 测试固定为 Node 环境、无网络和无 DOM；Query 测试必须集中在 QueryClient、query keys、invalidation 和 HTTP cancellation 等可在 Node 验证的接口，不新增组件测试运行时。
- `agent-docs/TESTING.md:14` — 仓库完整回归门禁是 `pnpm test && pnpm typecheck && pnpm lint && pnpm build`，且不能用静态检查冒充测试通过。
- `agent-docs/TESTING.md:48` — Admin UI 变更必须在真实浏览器覆盖桌面/窄屏、两种颜色模式、失败态和空态。
- `agent-docs/BUILD.md:20` — 所有 install、dev、test 和 build 命令从仓库根运行；`pnpm install` 会执行 Prisma generate 与 Nuxt prepare，禁止并发运行多个 pnpm install。
- 当前审查基线命令 `rg -o 'useEffect\\(' apps/admin/src | wc -l` 返回 40，`rg -o 'useCallback\\(' apps/admin/src | wc -l` 返回 27，`rg -o 'useMemo\\(' apps/admin/src | wc -l` 返回 1。
- 当前审查已验证 `pnpm fmt:check`、`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build` 通过；浏览器已验证 Overview、趋势切换、动态搜索和故障后重试，实施阶段必须保持这些基线行为。

## Target module map

- `apps/admin/src/app/server-state/client.ts` (new) — 单例 QueryClient、统一 defaults、cache clear 入口和测试构造器。
- `apps/admin/src/app/server-state/overview.ts` (new) — overview/counts、trend、calendar query keys/options。
- `apps/admin/src/app/server-state/taxonomy.ts` (new) — category/tag query keys/options 与 taxonomy mutation invalidation。
- `apps/admin/src/app/server-state/assets.ts` (new) — asset list/detail/picker query keys/options 与 upload/status/delete invalidation。
- `apps/admin/src/app/server-state/music.ts` (new) — music list/detail/picker query keys/options 与 create/update/delete invalidation。
- `apps/admin/src/app/server-state/activities.ts` (new) — activity list/detail query keys/options 与 create/update/delete invalidation。
- `apps/admin/src/app/server-state/articles.ts` (new) — article list、workspace supporting data keys/options 与 article invalidation；不接管 editor draft/store。
- `apps/admin/src/app/server-state/comments.ts` (new) — comment list query keys/options 与 reply/delete invalidation。
- `apps/admin/src/app/server-state/users.ts` (new) — user list/detail query keys/options 与 edit/delete invalidation。
- `apps/admin/src/hooks/use-debounced-commit.ts` (new) — 六个搜索入口共享的 250/300ms timer lifecycle；内部只保留一个合法 timer cleanup Effect，不返回手工 memoized callback。
- `apps/admin/src/app/bootstrap.ts` (new) — 一次性 session-expired handler 注册和 session restore 启动。

### Query key rules

- 所有 key 以 `['admin', '<domain>']` 开头；list/detail/picker 使用不同的稳定子 key。
- key 参数只使用 contracts query 中的规范化原始值或稳定对象；不得继续手写字符串 request key 或 `JSON.stringify`。
- 空字符串在进入 key 和请求前按现有 API 规则归一为未提供；页码、pageSize、布尔筛选和 status 保持显式。
- detail key 在 id 非法或缺失时不创建有效 query；dialog/picker 通过 `enabled` 控制生命周期。

### Cross-domain invalidation rules

- taxonomy create/update/delete → taxonomy、article lists/workspace metadata、overview composition。
- asset upload/status/delete → asset lists/details/pickers、overview storage；只在响应证明关联资源变化时再失效 music/articles/activities，禁止预防性全失效。
- music create/update/delete → music lists/details/pickers、overview；music metadata 变化同时失效 activity list/detail，因为 activity DTO 内嵌音乐投影。
- activity create/update/delete → activity lists/details、overview counts/trends/calendar；删除可能级联评论时同时失效 comments 和 users/overview comment counts。
- article create/save/publish/unpublish/delete → article lists/workspace metadata、taxonomy counts、overview counts/trends/calendar；删除可能级联评论或改变资产引用时同时失效 comments/users/assets 受影响 family。
- comment reply/delete/batch delete → comment lists、user list/detail comment counts、overview counts/trends。
- user edit/delete → user lists/details、comment lists；删除导致评论级联时同时失效 overview。
- auth expiry/logout/account switch → `queryClient.clear()`；这是唯一允许清空全部 Admin query 的路径。

## Incremental implementation

### Slice 1 — Query foundation and Overview vertical slice

- **Outcome:** Overview、Trend、Cadence 不再包含手写请求 Effect/Callback；Query transport 支持取消，认证边界能清理 cache，真实 Overview 行为保持不变。
- **Scope:**
  - `pnpm-workspace.yaml`
  - `apps/admin/package.json`
  - `pnpm-lock.yaml`
  - `apps/admin/src/app/server-state/client.ts` (new)
  - `apps/admin/src/app/server-state/overview.ts` (new)
  - `apps/admin/src/app/server-state/client.test.ts` (new)
  - `apps/admin/src/app/server-state/overview.test.ts` (new)
  - `apps/admin/src/app/api/http.ts`
  - `apps/admin/src/app/api/http.test.ts` (new)
  - `apps/admin/src/app/api/overview.ts`
  - `apps/admin/src/app/providers.tsx`
  - `apps/admin/src/store/auth.ts`
  - `apps/admin/src/features/overview/overview-page.tsx`
  - `apps/admin/src/features/overview/trend-card.tsx`
  - `apps/admin/src/features/overview/cadence-card.tsx`
- **Changes:**
  - 将 `@tanstack/react-query: ^5.102.8` 加入 `catalogs.admin` 和 Admin dependencies，串行运行一次 `pnpm install` 更新 lockfile。
  - 创建 QueryClient 单例和 test factory；固定 agreed defaults，不引入 Devtools。
  - 在现有 `AppProviders` 中加入 `QueryClientProvider`；此切片暂时保留 auth bootstrap Effect，避免同时改变两个生命周期边界。
  - 为 `HttpRequestOptions` 增加 `signal?: AbortSignal`；将 signal 传给 ky，并让调试延迟在 signal abort 时立即结束。
  - 保持 `refreshOnce` 为共享 promise，不用单个 query signal 取消 refresh；refresh 后先检查 caller signal，已取消则不重试原请求。
  - AbortError / 已取消 signal 不包装为 `ApiNetworkError`，Query cancellation 不进入页面错误态。
  - 让 overview 三个 read 方法接受可选 signal，并在 query options 中消费它。
  - 将 overview 三块改为 `useQuery`；重试按钮调用 query `refetch`，metric/days 直接组成 query key。
  - 删除 overview 三块的 `fetchSeq`、`load`、`reload`、本地服务器数据状态和 `useDerivedReset` 调用。
  - 在 auth 的 session-expired、forbidden、logout、use-another-account 路径清 Query cache；sign-in 前也清理上一主体残留。
  - Node tests 覆盖 defaults、key normalization、cache clear、signal 透传、调试延迟取消、refresh 后取消跳过 retry。
- **Preserved behavior:** 登录与 token refresh、Overview 三块独立错误、骨架高度、趋势 metric/days、重试按钮、PWA、路由和中文错误不变。
- **Dependencies:** 当前 apiClient、auth store、Overview API；无前置切片。
- **Verification:**
  - `pnpm -F @grey-flowers/admin run fmt:check`
  - `pnpm -F @grey-flowers/admin run lint`
  - `pnpm -F @grey-flowers/admin run typecheck`
  - `pnpm -F @grey-flowers/admin run test`
  - `pnpm -F @grey-flowers/admin run build`
  - 浏览器登录 `http://localhost:${ADMIN_PORT:-2409}/`：Overview counts、Trend、Cadence 均加载；14 天切 7 天只产生一个有效 GET；阻断 `/overview/trends` 后出现原错误态，解除阻断点击重试恢复。
  - 浏览器退出登录后确认 Overview DOM 消失；重新登录后不先显示旧主体缓存。
- **Done when:** Overview 三个文件无 `useEffect`/`useCallback`/`fetchSeq`，HTTP cancellation tests 通过，认证 cache clear 有自动化证据，Overview 浏览器矩阵通过。

### Slice 2 — Taxonomy server state and mutation invalidation

- **Outcome:** Categories 和 Tags 完全使用 taxonomy Query 状态；增删改后由精确 invalidation 刷新，不再维护 reload/request lifecycle。
- **Scope:**
  - `apps/admin/src/app/server-state/taxonomy.ts` (new)
  - `apps/admin/src/app/server-state/taxonomy.test.ts` (new)
  - `apps/admin/src/app/api/taxonomy.ts`
  - `apps/admin/src/features/taxonomy/categories-page.tsx`
  - `apps/admin/src/features/taxonomy/tags-page.tsx`
- **Changes:**
  - 为 category/tag list read 方法加入可选 signal。
  - 建立 category/tag list keys/options；unused filter 是 tag query key 的显式布尔字段。
  - 页面使用 `useQuery`；create/update/delete 继续发生在事件处理器，并通过 `useMutation` 暴露 pending/error。
  - mutation 成功后 await taxonomy、articles/workspace metadata、overview composition 的规定 invalidation。
  - 删除 reload callback、fetchSeq、本地 list data/loading 和 request-key reset；保留表单草稿和 dialog state。
  - 测试 query key 隔离、unused filter key、taxonomy invalidation 只命中规定 family。
- **Preserved behavior:** 分类冲突/被引用错误、标签 unused filter、创建输入、对话框动画、toast 和删除确认不变。
- **Dependencies:** Slice 1 QueryClient、signal-aware HTTP、overview keys。
- **Verification:**
  - `pnpm -F @grey-flowers/admin run fmt:check && pnpm -F @grey-flowers/admin run lint && pnpm -F @grey-flowers/admin run typecheck && pnpm -F @grey-flowers/admin run test && pnpm -F @grey-flowers/admin run build`
  - 浏览器切换“只看未使用”只发对应 tag key GET；阻断后重试恢复。
  - 在确认本地数据库后创建一个唯一前缀 category/tag，再删除它们；列表和 Overview composition 无手工刷新即更新。
- **Done when:** taxonomy 两页无请求 Effect/Callback/`useDerivedReset`，mutation invalidation 自动化和本地浏览器往返均通过。

### Slice 3 — Asset lists, details and picker lifecycle

- **Outcome:** Asset list/detail/picker 由统一 server-state module 管理；Picker 使用 infinite query；上传后不再产生旧条件 + 新条件双请求。
- **Scope:**
  - `apps/admin/src/app/server-state/assets.ts` (new)
  - `apps/admin/src/app/server-state/assets.test.ts` (new)
  - `apps/admin/src/app/api/assets.ts`
  - `apps/admin/src/features/assets/list-page.tsx`
  - `apps/admin/src/features/assets/detail-page.tsx`
  - `apps/admin/src/features/assets/upload-dialog.tsx`
  - `apps/admin/src/features/articles/editor/asset-picker.tsx`
  - `apps/admin/src/features/taxonomy/categories-page.tsx`
- **Changes:**
  - asset list/detail read 方法接收 signal；upload XHR 保持现有独立进度/abort 实现，不强行塞进 query function。
  - 建立 list/detail/picker query keys/options；AssetPicker 改为 `useInfiniteQuery`，由 `getNextPageParam` 计算下一页，删除 items/page/total 手工合并。
  - list filters/page/status 直接组成 key；query refetch 负责 retry，删除 `requestKey`、fetchSeq、load/reload。
  - upload/status/delete 仍在用户事件中执行；成功后 await 规定 asset/overview invalidation。上传回调先提交新筛选状态，再只依赖新 query key；不得立即用旧闭包 refetch。
  - UploadDialog 拆为动画外壳与 keyed inner form；每次 open session 产生新 identity，同一目标重新打开也重置，不再调用 `useDerivedReset(open, ...)`。
  - 测试 picker pagination key、next-page 计算、asset mutation invalidation 和 clear-filter 后只保留一个目标 key。
- **Preserved behavior:** purpose/status/mediaType 筛选、分页、详情操作、上传进度、R2 presign→PUT→confirm、安全错误、分类封面选择和退出动画不变。
- **Dependencies:** Slice 1 Query foundation；Slice 2 taxonomy page 已能接受新的 AssetPicker 实现。
- **Verification:**
  - `pnpm -F @grey-flowers/admin run fmt:check && pnpm -F @grey-flowers/admin run lint && pnpm -F @grey-flowers/admin run typecheck && pnpm -F @grey-flowers/admin run test && pnpm -F @grey-flowers/admin run build`
  - 浏览器验证 asset filters/page/status、详情、picker 首屏和 load-more、关闭后取消、错误后重试。
  - 通过网络记录确认“非默认筛选下上传完成并清筛选”只留下一个新条件 GET；若当前 R2 不是明确测试环境，则使用 query/invalidation 自动化证据，不执行真实上传。
- **Done when:** asset list/detail/picker 无请求 Effect/Callback/fetchSeq，UploadDialog 无 `useDerivedReset`，双请求回归有网络证据。

### Slice 4 — Music server state and shared debounced commit

- **Outcome:** Music list/detail/picker 统一走 Query；搜索延迟集中为一个 timer module；编辑和上传成功后精确刷新 music/asset/activity/overview 数据。
- **Scope:**
  - `apps/admin/src/hooks/use-debounced-commit.ts` (new)
  - `apps/admin/src/app/server-state/music.ts` (new)
  - `apps/admin/src/app/server-state/music.test.ts` (new)
  - `apps/admin/src/app/api/music.ts`
  - `apps/admin/src/features/music/list-page.tsx`
  - `apps/admin/src/features/music/detail-page.tsx`
  - `apps/admin/src/features/music/edit-dialog.tsx`
  - `apps/admin/src/features/music/upload-wizard.tsx`
  - `apps/admin/src/features/activities/music-picker.tsx`
- **Changes:**
  - music list/detail read 方法接收 signal；建立 list/detail/picker query keys/options。
  - 新 debounced commit hook 只持有 timer ref 和卸载 cleanup Effect；输入事件 schedule committed search + page reset，保持现有 300ms 行为，不使用 `useCallback`。
  - Music list/detail/picker 改用 `useQuery`，Picker 用 `enabled: isOpen`；关闭时 signal abort，旧结果不得写入隐藏 UI。
  - Edit dialog 拆 keyed inner form，删除 `useDerivedReset(open, ...)`；mutation pending 替代 saving state。
  - upload wizard 保留对象 URL cleanup Effect和 XHR progress；成功后 await music/assets/overview invalidation。
  - music metadata mutation 同时失效 activity projection；删除音乐继续同步 player store。
  - 测试 query keys、picker enabled 输入、music cross-domain invalidation 和 debounce scheduler 的 timer/cancel 纯逻辑。
- **Preserved behavior:** 300ms 搜索、incomplete filter、播放器队列、封面/音源上传、进度、编辑文案、详情删除导航和 Picker 选择上限不变。
- **Dependencies:** Slice 1 Query foundation、Slice 3 assets module。
- **Verification:**
  - `pnpm -F @grey-flowers/admin run fmt:check && pnpm -F @grey-flowers/admin run lint && pnpm -F @grey-flowers/admin run typecheck && pnpm -F @grey-flowers/admin run test && pnpm -F @grey-flowers/admin run build`
  - 浏览器快速输入搜索，只在 300ms commit 后产生目标 GET；切换 incomplete、分页和详情均正常。
  - 打开 MusicPicker 后启用网络延迟并立即关闭，确认请求取消且重新打开不闪旧错误/旧结果。
- **Done when:** music list/detail/picker 无请求 Effect/Callback/`useDerivedReset`，共享 debounce timer 和关闭取消均有证据。

### Slice 5 — Activities list and keyed compose initialization

- **Outcome:** Activity list/detail reads 由 Query 管理；编辑 compose 在数据就绪后以 keyed form 初始化，不再用 Effect 逐字段复制响应。
- **Scope:**
  - `apps/admin/src/app/server-state/activities.ts` (new)
  - `apps/admin/src/app/server-state/activities.test.ts` (new)
  - `apps/admin/src/app/api/activities.ts`
  - `apps/admin/src/features/activities/list-page.tsx`
  - `apps/admin/src/features/activities/compose-page.tsx`
- **Changes:**
  - activity list/detail read 方法接收 signal；建立 list/detail keys/options。
  - List 复用 debounced commit；删除 query Effect、fetchSeq、reload callback、request reset 和服务器数据 state。
  - ComposePage 外层负责 route id/query 状态；detail pending/error 在外层展示，成功后挂载 `key={activityId}` 的 inner form，以 query data 作为 lazy initial state。
  - create/update/delete 在事件处理器中执行；成功后 await activities/overview/comments/users 规定 invalidation，再保持原导航和 player cleanup。
  - 测试 activity keys、create/update/delete invalidation 和 keyed initial-state 纯转换函数。
- **Preserved behavior:** 300ms 搜索、播放队列、图片/音乐编辑、上传、拖拽、粘贴、创建/编辑路由、错误文案和导航不变。
- **Dependencies:** Slice 3 AssetPicker、Slice 4 MusicPicker/debounce、Slice 1 Query foundation。
- **Verification:**
  - `pnpm -F @grey-flowers/admin run fmt:check && pnpm -F @grey-flowers/admin run lint && pnpm -F @grey-flowers/admin run typecheck && pnpm -F @grey-flowers/admin run test && pnpm -F @grey-flowers/admin run build`
  - 浏览器验证活动列表、搜索、分页、故障重试；只读打开两个不同 activity edit route，第二个表单不得保留第一个草稿。
  - 创建/编辑写操作只在明确本地测试数据环境执行；否则以 mutation/invalidation tests 和只读初始化浏览器证据完成 checkpoint。
- **Done when:** Activities list/compose 无 server-fetch Effect/Callback/fetchSeq，两个 edit id 的 keyed 初始化无串草稿。

### Slice 6 — Articles list and workspace supporting data

- **Outcome:** Article list 和 workspace supporting data 由 Query 管理；article editor store 继续保持原 autosave/offline SSOT，并能在写操作后使列表/overview/taxonomy cache 一致。
- **Scope:**
  - `apps/admin/src/app/server-state/articles.ts` (new)
  - `apps/admin/src/app/server-state/articles.test.ts` (new)
  - `apps/admin/src/app/api/articles.ts`
  - `apps/admin/src/features/articles/list-page.tsx`
  - `apps/admin/src/features/articles/new-article-page.tsx`
  - `apps/admin/src/features/articles/workspace-page.tsx`
  - `apps/admin/src/store/article-editor.ts`
  - `apps/admin/src/store/article-editor.test.ts`
- **Changes:**
  - article list 和 supporting reads 接收 signal；建立 list/workspace keys/options。
  - List 复用 debounced commit，删除请求 Effect/Callback/fetchSeq/request reset。
  - Workspace 的 recent articles、categories、tags 改为并行 Query；保留已批准的 `key={numericId}` inner workspace identity。
  - New article、editor save/publish/unpublish/delete 成功后调用 articles module 的精确 cache update/invalidation；不得把 editor draft 写入 Query cache 或改变 store phase machine。
  - `useArticleEditor` 继续保留 store factory `useMemo` 和挂载 reload Effect；在测试中锁定 autosave drain、conflict、offline、restore 既有行为。
  - 测试 article keys、workspace parallel options、cross-domain invalidation，以及 editor store 在加入 invalidation 后原测试仍通过。
- **Preserved behavior:** status 深链、250ms 标题搜索、文章创建、编辑器草稿/autosave/offline/conflict/version/preview、Inspector state、MDC 原文 SSOT 和路由不变。
- **Dependencies:** Slice 1 Query foundation、Slice 2 taxonomy keys、Slice 3 assets keys、Slice 4 debounce。
- **Verification:**
  - `pnpm -F @grey-flowers/admin run fmt:check && pnpm -F @grey-flowers/admin run lint && pnpm -F @grey-flowers/admin run typecheck && pnpm -F @grey-flowers/admin run test && pnpm -F @grey-flowers/admin run build`
  - 浏览器验证 all/draft/published 深链、搜索、分页、workspace 切换 article id、recent/options 加载、网络失败后重试。
  - `apps/admin/src/store/article-editor.test.ts` 全部通过，且删除 invalidation call 会使新增 cache-coherence case 失败。
- **Done when:** Article list/workspace supporting reads 无请求 Effect/Callback，editor store 原行为测试全绿且只新增 cache coherence，不改变 phase machine。

### Slice 7 — Comments and Users cross-domain state

- **Outcome:** Comments list、Users list/detail 和回复/编辑/删除后的交叉刷新统一由 Query invalidation 管理；所有相关 dialog 用 session identity 重置。
- **Scope:**
  - `apps/admin/src/app/server-state/comments.ts` (new)
  - `apps/admin/src/app/server-state/comments.test.ts` (new)
  - `apps/admin/src/app/server-state/users.ts` (new)
  - `apps/admin/src/app/server-state/users.test.ts` (new)
  - `apps/admin/src/app/api/comments.ts`
  - `apps/admin/src/app/api/users.ts`
  - `apps/admin/src/features/comments/list-page.tsx`
  - `apps/admin/src/features/comments/reply-dialog.tsx`
  - `apps/admin/src/features/comments/session-dialog.tsx`
  - `apps/admin/src/features/users/list-page.tsx`
  - `apps/admin/src/features/users/detail-dialog.tsx`
  - `apps/admin/src/features/users/edit-dialog.tsx`
  - `apps/admin/src/hooks/use-dialog.ts`
- **Changes:**
  - comment/user list/detail reads 接收 signal；建立稳定 query keys/options。
  - 两个列表复用 debounced commit；删除请求 Effect/Callback/fetchSeq/request reset。
  - `useDialog` 增加单调递增的 session identity；每次 `open(data)` 都产生新 session，同一 data 重开也不同。Dialog inner form 以 session key 初始化，退出动画期间继续保留 data。
  - Reply、session quick reply、user edit 使用 mutation pending/error；成功后 await comments/users/overview 交叉 invalidation。
  - UserDetail 的 user id + comment page 直接组成 query key，不再 render-time 重置 page/data；切换用户由 keyed inner detail module 重置到第 1 页。
  - 测试 dialog session identity、comments/users key isolation、reply/delete/edit cross-domain invalidation。
- **Preserved behavior:** 300ms 筛选、日期条件、批量选择、评论树、回复通知、用户角色/资料编辑、删除级联提示、详情分页和退出动画不变。
- **Dependencies:** Slice 1 Query foundation、Slice 4 debounce、Slice 5/6 activity/article key families用于可能的评论级联失效。
- **Verification:**
  - `pnpm -F @grey-flowers/admin run fmt:check && pnpm -F @grey-flowers/admin run lint && pnpm -F @grey-flowers/admin run typecheck && pnpm -F @grey-flowers/admin run test && pnpm -F @grey-flowers/admin run build`
  - 浏览器验证 comments/users 搜索筛选、分页、用户详情翻页、失败重试；连续打开两个用户和同一用户两次均从正确第 1 页/表单初始值开始。
  - reply/edit/delete 写操作仅在本地可恢复数据上执行；至少一个 mutation 后同时观察主列表和关联详情/count 自动刷新。
- **Done when:** Comments/Users 相关文件无请求 Effect/Callback/`useDerivedReset`，dialog session 和交叉 invalidation 有自动化与浏览器证据。

### Slice 8 — External-effect normalization, bootstrap and contract cleanup

- **Outcome:** 所有服务器状态消费者迁移完成；删除旧 reset/request 基础设施；剩余 Effect 均为可解释、可清理的外部系统同步，文档成为新的维护契约。
- **Scope:**
  - `apps/admin/src/app/bootstrap.ts` (new)
  - `apps/admin/src/main.tsx`
  - `apps/admin/src/app/providers.tsx`
  - `apps/admin/src/hooks/use-keyboard-inset.ts`
  - `apps/admin/src/hooks/use-paste-files.ts`
  - `apps/admin/src/hooks/use-derived-reset.ts` (delete)
  - `apps/admin/src/hooks/use-resizable-edge.ts`
  - `apps/admin/src/app/shell/console-rail.tsx`
  - `apps/admin/src/app/shell/api-delay-control.tsx`
  - `apps/admin/src/features/music/player/music-player.tsx`
  - `apps/admin/src/features/music/player/now-playing-sheet.tsx`
  - `apps/admin/src/ui/overlay.tsx`
  - `apps/admin/src/ui/charts.tsx`
  - `apps/admin/src/app/pwa.tsx`
  - `apps/admin/src/features/articles/editor/code-mirror-pane.tsx`
  - `apps/admin/src/features/music/upload-wizard.tsx`
  - `apps/admin/src/store/article-editor.ts`
  - `agent-docs/ARCHITECTURE.md`
  - `agent-docs/CODE_STYLE.md`
  - `agent-docs/TESTING.md`
- **Changes:**
  - 将 session-expired handler 注册和一次性 `restoreSession()` 启动移到 `bootstrapAdminApp()`，由 `main.tsx` 在 render 前调用；`AppProviders` 只组合 providers。
  - `useKeyboardInset` 改用 `useSyncExternalStore` 订阅 `visualViewport`，subscribe/getSnapshot 放在组件外并保持 snapshot 原始 number 稳定。
  - `usePasteFiles` 用 `useEffectEvent` 读取最新 onFiles，只保留 document paste subscription Effect。
  - `ExitSignaler` 用 `useEffectEvent` 读取最新 onExited，只保留卸载 cleanup Effect。
  - `useResizableEdge.onResizeEnd` 接收本次拖拽的最终 size；ConsoleRail 删除 sizeRef 镜像 Effect。
  - ApiDelayControl 改用已安装的 React Aria overlay/popover dismissal 能力，删除 document pointerdown/keydown Effect。
  - MusicPlayer 使用 `openTrackId` 表示“为哪一首曲目打开”；NowPlayingSheet 可见性纯派生，track 清空/切换不会重新打开旧 sheet，删除反写父 state Effect。
  - 保留并逐项注释真正外部同步：debounced timer cleanup、paste subscription、overlay exit cleanup、PWA 两个 effect、CodeMirror action registration、CalendarHeatmap DOM scroll、upload object URL revoke、ComposeMenu global Escape、article editor initial server reload。
  - 删除 `useDerivedReset.ts`；全仓确认无 `reloadKey`、`fetchSeq`、旧 `requestKey` reset 或 server-fetch raw Effect。
  - 更新 Architecture 描述 `app/server-state` seam、Zustand/Query ownership；更新 Code Style 的 Effect 分类和 Query/Callback 规则；更新 Testing 的 Node Query tests 与浏览器 acceptance。
- **Preserved behavior:** PWA 更新、CodeMirror 图片动作、键盘 inset、粘贴、overlay 退出回调、侧栏拖拽/落盘、API delay 控件、播放器 sheet、日历滚动和 editor store 生命周期不变。
- **Dependencies:** Slices 1–7 全部服务器状态迁移完成。
- **Verification:**
  - `rg -o 'useCallback\\(' apps/admin/src | wc -l` 输出 `0`。
  - `rg -o 'useEffect\\(' apps/admin/src | wc -l` 输出不大于 `12`。
  - `rg -n 'useDerivedReset|reloadKey|fetchSeq' apps/admin/src` 无输出。
  - `rg -n 'useEffect\\(' apps/admin/src` 的每一项都能映射到本切片列出的外部系统；不得存在“为了同步另一个 React state”的 Effect。
  - `pnpm fmt:check && pnpm test && pnpm typecheck && pnpm lint && pnpm build`
  - Admin browser matrix：桌面 + 窄屏、浅色 + 深色；Overview、每个顶级资源列表、详情/picker/dialog、错误/重试、空态、分页、搜索、PWA 控件、播放器、文章 workspace。
  - 浏览器 console 无 React Compiler、stale update、unhandled rejection 或 abort-as-error；网络中每次 query key 变化只有一个有效 GET（CORS OPTIONS 不计）。
- **Done when:** 旧基础设施删除、计数门禁通过、每个剩余 Effect 有外部系统证据、完整仓库 gate 与浏览器矩阵通过。

## Final acceptance criteria

- [ ] `@tanstack/react-query@^5.102.8` 仅通过 workspace Admin catalog 引入，lockfile 由单次串行 install 更新。
- [ ] `apps/admin/src/app/server-state/` 成为普通服务器状态的唯一 Query seam；各页面不直接重建 query keys 或 invalidation matrix。
- [ ] apiClient 的 read path 全程传递 AbortSignal；调试延迟和 auth retry 尊重取消；共享 refresh 不被单个 query 取消。
- [ ] Overview、Taxonomy、Assets、Music、Activities、Articles、Comments、Users 的列表/详情/picker 不再用 raw Effect fetch。
- [ ] mutation 成功后只 invalidates 已记录的受影响 families；无全局 `invalidateQueries()`，auth 边界除外。
- [ ] logout、session expiry、forbidden、account switch 后 Query cache 为空；重新登录不展示旧主体数据。
- [ ] `useDerivedReset`、`reloadKey`、`fetchSeq` 和 request-key render reset 全部删除。
- [ ] `useCallback` 调用数为 0；唯一保留的 `useMemo` 仍是 article editor store identity。
- [ ] `useEffect` 调用数不超过 12，每个调用都同步一个明确外部系统并有 cleanup 或一次性生命周期理由。
- [ ] 搜索仍在既有 250/300ms 后提交；分页、筛选、深链、骨架、错误、重试和空态行为不变。
- [ ] Asset/Music Picker 关闭会取消 active read，重新打开不显示旧错误或旧选择上下文。
- [ ] 同一 dialog target 重开和不同 target 连续打开均重建正确表单/分页 state，同时保留退出动画 data。
- [ ] article editor autosave、offline、conflict、restore、preview、publish/unpublish 行为和原测试保持不变。
- [ ] StrictMode 下每个 query key 只有一个有效 GET；无旧响应覆盖、重复上传后 GET 或取消错误 toast。
- [ ] `pnpm fmt:check && pnpm test && pnpm typecheck && pnpm lint && pnpm build` 完整通过。
- [ ] Admin 真实浏览器在桌面/窄屏、浅色/深色覆盖 happy/error/empty/retry，并且 console/network 无新增错误。

## Risks and controls

- 当前已有大面积暂存变更，实施切片可能覆盖用户工作 → 每个切片开始记录 `git status --short --branch -uall` 和相关 staged diff；禁止 reset/checkout/stash/clean，只在计划列出的文件中基于当前内容编辑。
- Query cache 可能跨认证主体泄露内存数据 → Slice 1 先实现并测试所有 auth exit path 的 `queryClient.clear()`，后续切片才能引入更多敏感 cache。
- AbortSignal 与共享 token refresh 相互取消可能造成随机登出 → refresh promise 不绑定 caller signal；caller abort 只阻止自己的原请求 retry，并用并发测试覆盖两 query 共用一次 refresh、其中一个取消。
- 默认 Query cache 会改变 remount loading 视觉 → 页面按 `isFetching` 保持现有骨架；关闭 focus refetch 和 retry，不启用 keepPreviousData；浏览器逐页对比。
- invalidation 太少产生 stale data，太多产生请求风暴 → 使用本计划的 cross-domain matrix；每个 mutation policy 以 QueryClient node test 验证命中 family，并用网络日志检查请求数量。
- infinite query 改变 AssetPicker 页序或重复项目 → query key 包含 purpose/status/pageSize，next-page 由 total/items 计算；测试最后一页、空页和重复页保护。
- keyed dialog 在退出动画前清数据 → session key 只在 `open(data)` 增长，data 仍由 useDialog 保留至 onExited clear；浏览器检查关闭动画和同 target reopen。
- server-state 与 article editor 双 ownership → articles Query 不保存 editor draft；editor store 仍是 draft/autosave SSOT，只在成功 mutation 后调用 invalidation helper。
- TanStack Query 增加 bundle 体积 → 每个 checkpoint 记录 Admin build chunk/gzip；若依赖引入异常大或 compiler skip，停在最近通过切片调查，不退回自制 Query 模板。
- 本地浏览器 mutation 可能触及生产 DB/R2 → 运行前只读取并确认当前目标为本地/测试；R2 未明确为测试环境时禁止真实 upload/delete，以 node invalidation tests 和只读 browser evidence 替代。
- 一次性 app bootstrap 在 HMR/StrictMode 下重复 → bootstrap module 自身持有幂等 guard，main 只调用一次；测试重复调用不会重复 handler 或 session restore。
- 最终 Effect 数量目标诱发错误删除 → 数量只是门禁下限；任何 Effect 删除都必须先归类，PWA/CodeMirror/DOM/object URL/editor persistence 等正当外部同步不得为达标而移除。

## Deferred scope

- TanStack Router loaders、route prefetch 和 `ensureQueryData`：会改变导航/缓存契约，不是本轮 Effect 返工所必需。
- optimistic updates、persistent cache、focus refetch、polling 和 stale-while-revalidate UX：属于后续产品体验决策，本轮先保持现有 loading/error 行为。
- 将筛选、页码和搜索全面迁入 URL：会改变历史记录、深链和输入时序，需单独设计。
- 文章编辑器 store 迁入 Query：autosave/offline/conflict 是独立复杂工作流，本计划只做 cache coherence。
- 新增 jsdom、React Testing Library、MSW 或浏览器 E2E 测试框架：现有 Node Vitest + 真实浏览器验证已覆盖本计划；测试架构升级另立计划。
- API、contracts、Prisma、migration、R2 数据迁移和生产部署：本计划无服务端或数据契约变更，实施完成后仍需单独授权任何发布动作。
