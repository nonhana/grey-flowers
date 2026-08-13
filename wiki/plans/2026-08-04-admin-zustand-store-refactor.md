# Grey Flowers Admin 状态管理迁移至 zustand（专项重构 SSOT）

## 状态与用途

- 决策日期：2026-08-04
- 状态：待实施（本文为本次重构的 SSOT，实施后在本节追加验收证据）
- 文档类型：专项重构设计与实施任务边界
- 读者：`apps/admin` 状态层、音乐播放器、文章编辑器、认证启动链路、验收维护者
- 前置约束：
  - [admin-technology-stack](../design/2026-08-01-admin-technology-stack.md) 的「状态边界」与「依赖准入规则」（本文首次触发该规则的正式记录，见 §一「推翻设计文档」一行）
  - [react-frontend-architecture](../design/2026-08-01-react-frontend-architecture.md) 的 feature 纵切与「禁止局部状态成为业务数据的第二真相」
  - [2026-08-04-music-library-slice.md](./2026-08-04-music-library-slice.md) §7.1 的播放器 store（本文将其 `useSyncExternalStore` 实现替换为 zustand，并推翻其「不引入状态库」一行）
  - [2026-08-03-content-publishing-slice.md](./2026-08-03-content-publishing-slice.md) 的 `use-article-editor` 保存状态机（行为必须一字不差地保留）
  - [2026-08-02-grey-flowers-authentication-system.md](./2026-08-02-grey-flowers-authentication-system.md) 的认证状态机与 `Principal`
  - 仓库规范：[CODE_STYLE](../../agent-docs/CODE_STYLE.md)（react-compiler、单调用者不抽抽象、优先已装库不重复实现）、[TESTING](../../agent-docs/TESTING.md)、[BUILD](../../agent-docs/BUILD.md)、[PACKAGES](../../agent-docs/PACKAGES.md)

本文授权：正式引入 `zustand@5` 作为 `apps/admin` 的全局/领域状态管理库；新建 `apps/admin/src/store/` 目录；把播放器（`audio-player-store.ts`）、主题（`theme-store.ts`）、文章编辑器（`use-article-editor.ts`）、认证（`app/providers.tsx`）四处状态全部迁移为 zustand 组织；删除全部手搓 `useSyncExternalStore` 与外置 `AuthContext`。**行为必须等价，除播放器重渲染隔离与 ref 镜像清零外不做任何功能变更。**

## 一、决策记录（本重构定案，2026-08-04 拍板）

| 决策点 | 决定 | 理由 / 备注 |
| --- | --- | --- |
| 状态库选型 | **`zustand@5.0.14`**（当前 latest，npm view 实测），加入 `catalogs.admin` | 极小（~1kb、无副作用导入）、无 Provider 树、`getState()` 可从任意层/事件/异步闭包读最新值、选择器粒度天然解决本文 §二.1 的高频重渲染 |
| **推翻设计文档** | 正式记录 `admin-technology-stack`§状态边界「初始版本不引入全局状态库」的**推翻**：其依赖准入条件的「复杂校验负担」与「证实的重复」均已满足 | 播放器与主题是手搓 `useSyncExternalStore`（重复造轮子）；编辑器为绕开 React 闭包问题出现 11 state + 6 ref 镜像 + 5 同步 effect 的协调负担。设计文档明文：**只有当原生方式出现证实的重复/复杂负担才按准入规则加库 —— 该条件已成立，不是"以后可能会用"** |
| 迁移范围 | **四处全迁**：player / theme / article-editor / auth，一次性彻底处理 | 本对话拍板；不搞「第一波/第二波」分期，避免新旧范式长期并存 |
| `store/` 目录 | 新建 `apps/admin/src/store/`，每个文件一个语义域 | 用户指定"新建专门 store 目录进行系统化管理" |
| 命名 | `store/player.ts`、`store/theme.ts`、`store/auth.ts`、`store/article-editor.ts`（去掉 `-store` 后缀） | 目录已表达语义；旧的 `-store.ts` 后缀是因为散落在 feature 目录里，迁入 `store/` 后冗余 |
| player 形态 | **全局单例 zustand store**（`create`）；单例 `<Audio>` 元素 + MediaSession + localStorage 持久化**留在 store 文件内** | 跨路由常驻语义不变；行为面最小、风险最低 |
| player 重渲染隔离 | 派生值不再预计算成 `view`；消费方改用**返回原始值的选择器**；新增 `SeekRow` 小组件独占 `currentTime/duration` 订阅 | 播放中 `timeupdate` 每秒 4~10 次，现全部消费方全量重渲染；隔离后只有进度行跟随时间 tick |
| theme 形态 | 全局单例 store；**对外 `useThemeMode`/`setThemeMode`/`ThemeMode` 名字与语义不变** | 消费方仅改 import 路径，行为零变更 |
| article-editor 形态 | **per-instance**：`createStore`（`zustand/vanilla`）工厂 `createArticleEditorStore(articleId)` + `useStore` 薄壳 hook；**`useArticleEditor` 返回形状不变** | 每个编辑实例独立状态；`get()/set()` 消灭全部 ref 镜像；对外 API 不动 → workspace-page / inspector-pane 零改动 |
| auth 形态 | 全局单例 store；`useAuth()` 经 `useShallow` 保持返回形状稳定；`AppProviders` **保留为启动壳**（一次性引导 + 挂会话过期 handler） | 消费方仅改 import 路径；启动时序与现在完全一致 |
| 明确不做 | 列表页 `filters/page/reloadKey`、对话框开关与其 `prevOpen` 渲染期重置、表单草稿、上传进度、`nowPlayingOpen`、`use-keyboard-inset`/`use-media-query`、`Image` 失败态 —— **全部不迁** | 这些是合法 React 本地状态，zustand 无收益；对照架构文档「仅一次性覆盖层或短暂交互→对应 React 组件」。见 §十 |
| 不引入范围 | 不引 devtools middleware、不引持久化 middleware（播放器音量与主题持久化为 hand-roll 一段 `setItem`，行为照搬）、不新建测试框架 | 保持最小依赖面；本仓库无前端测试框架，验收走 TESTING.md 静态门禁 + 人工矩阵 |

**明确不做**：不改任何消费者组件外观、不改路由、不改 UI 文案、不迁移 API 数据请求层（切片计划已明确数据层不在此范围）、不为单调用者抽抽象。

## 二、运营结果与完成边界

重构完成后管理员看到的行为与现在完全一致，但对工程师可见的变化是：

1. **播放中高频重渲染被隔离**：`timeupdate`/`durationchange` 不再让 `PlayerBar`、`MiniPlayer`、`NowPlayingSheet`、音乐列表页整棵重渲染；只有新增的 `SeekRow` 跟随时间 tick 重渲染。
2. **编辑器 ref 镜像清零**：`use-article-editor.ts` 的 6 个 `*Ref`、5 个同步 effect、每处 `setXState + xRef.current = x` 双写全部删除；防抖自动保存 / 单飞 / 冲突解决 / 离线恢复统一走 `get()/set()`。
3. **认证状态脱离 React 树可达**：`useAuthStore.getState()` 可在任意模块（含 apiClient 拦截器）同步读当前身份；启动壳 `AppProviders` 继续负责引导时序。
4. **四种"全局/领域"状态统一为 zustand 单一范式**，`store/` 目录即状态真相源；删除全部手搓订阅（`listeners` Set / `emit` / `computeView` / `view` / `AudioPlayerView` / `AuthContext`）。

完成边界（闭环，行为等价即通过）：

- 播放器：单例 `<Audio>` 跨路由常驻；循环/上下首/seek/音量/静音/Media Session/锁屏控制/删除当前曲目/编辑当前曲目 与重构前逐项一致。
- 编辑器：防抖自动保存（1s）、单飞重入队列、`idle/saving/saved/offline/conflict` 状态机、冲突 `keep-mine/take-server`、离线草稿恢复（idb-keyval）、发布/取消发布/版本/预览前置门控，全部保持。
- 主题：三态切换 + 跟随系统天光 + localStorage 持久化 + **首帧无白闪**（index.html 引导脚本契约不被破坏）。
- 认证：`checking → authenticated/forbidden/network-error/unauthenticated` 全分支；登录/登出/换账号/会话过期处理，全部保持。
- 静态门禁：`pnpm typecheck && pnpm lint && pnpm build` 绿。

## 三、现状盘点与范围（全部事实来自本次探索的精确读取）

| 文件 | 行数 | 现状 | 处置 |
| --- | --- | --- | --- |
| `features/music/player/audio-player-store.ts` | 443 | 模块级单例 + `listeners` Set + `emit/computeView/view/AudioPlayerView` 手搓订阅；`<Audio>` + MediaSession + 音量持久化全揉一起 | **迁** → `store/player.ts`（删除手搓订阅层） |
| `app/theme/theme-store.ts` | ~60 | 手搓 `useSyncExternalStore` + matchMedia + localStorage | **迁** → `store/theme.ts` |
| `features/articles/editor/use-article-editor.ts` | ~400 | 11 个 `useState` + 6 个 `*Ref` 镜像 + 5 个同步 effect，防抖/单飞/冲突全在异步闭包读 ref | **迁** → `store/article-editor.ts` 工厂 + 薄壳 hook |
| `app/providers.tsx` | ~180 | 认证 `AuthContext` + Provider + 引导/登录/登出逻辑 | **迁** → `store/auth.ts`；`AppProviders` 收缩为启动壳 |
| 播放器 4 个消费者 + 音乐列表/详情页 | — | `useAudioPlayer()` 取整个 view + `audioPlayer.*` 动作 | 改选择器/动作引用（§六.5 对照表） |
| `theme-toggle.tsx` | — | `useThemeMode/setThemeMode` | 仅改 import 路径 |
| `admin-shell.tsx` / `console-shell.tsx` | — | `useAuth` 取 `{ state, signIn, ... }` | 仅改 import 路径（§九.4） |
| `workspace-page.tsx` / `inspector-pane.tsx` | — | `useArticleEditor` / `ReturnType<typeof useArticleEditor>` | **零改动**（薄壳保持形状） |
| 列表页/对话框/表单/hooks/ui.Image | — | 合法局部 state | **不迁** |

## 四、依赖准入

- `pnpm-workspace.yaml` → `catalogs.admin` 增加 `zustand: ^5.0.14`；`apps/admin/package.json` 加入 `zustand`（catalog:admin）。
- import 路径备忘（zustand v5）：
  - `import { create } from 'zustand'` — 全局单例（player/theme/auth）
  - `import { useStore } from 'zustand'` — 在组件内订阅 per-instance store（article-editor 薄壳）
  - `import { createStore } from 'zustand/vanilla'` — 工厂返回无 hook 的 store API（article-editor）
  - `import { useShallow } from 'zustand/react/shallow'` — 需要一次取多个字段且要稳定引用时（`useAuth` 返回对象、`SeekRow` 的 `{t,d}`）
- **react-compiler / CODE_STYLE 约束**：选择器绝不在渲染时返回内联对象/数组字面量——会因每次返回新引用导致无限重渲染（react-compiler 无法消除，因为返回的是新值不是新函数）；需要组合字段时用 `useShallow`。`create`/`useStore` 与 react-compiler 兼容，无需 `useCallback`/`useMemo` 包裹 store 本身。

## 五、store 目录结构（`apps/admin/src/store/`）

```
src/store/
  player.ts          # 全局单例：播放器状态 + 动作 + <Audio>/MediaSession/音量持久化
  theme.ts           # 全局单例：主题模式 + matchMedia + localStorage + paint
  auth.ts            # 全局单例：认证状态机 + 登录/登出/换账号/会话过期
  article-editor.ts  # 工厂：createArticleEditorStore(articleId)，每编辑实例一个
```

旧文件删除：`features/music/player/audio-player-store.ts`、`app/theme/theme-store.ts`、`app/providers.tsx` 中的 store 本体（`providers.tsx` 保留启动壳与 `AppProviders`）。

## 六、Player Store：`store/player.ts`

### 6.1 State（照搬现值，删去 `view`/`AudioPlayerView`）

```ts
interface PlayerState {
  currentIndex: number; currentTime: number; currentTrack: MusicTrack | null;
  duration: number; loopMode: LoopMode; muted: boolean;
  playlist: MusicTrack[]; shuffleHistory: number[];
  status: PlayStatus; volume: number;
}
```

### 6.2 Actions（与现 `audioPlayer` 同名，行为逐字保留）

`cycleLoopMode / next / pause / play / playById / prev / removeTrack / seek / setLoopMode / setVolume / stop / toggle / toggleMute`；内部另有 `resume / loadTrack / playByIndex / randomIndex / handleEnded / setPlaylist`。所有读最新值的路径改用 `get()`。

### 6.3 副作用保持

- 模块加载创建单例 `<Audio>`，事件（`loadstart/waiting/playing/pause/ended/error/timeupdate/durationchange`）映射为 `set({ status: ... })` / `set({ currentTime })` 等——**逐字保留现有状态机注释与语义**。
- MediaSession metadata + `setPositionState` + play/pause/previoustrack/nexttrack/seekto/seekbackward/seekforward 处理器照搬；处理函数内读 `get()`。
- 音量读写 localStorage `gf.player.volume` 照搬（含非法值兜底 `readStoredVolume`）。

### 6.4 派生值用选择器（返回原始值，不用 useShallow）

```ts
const hasNext = usePlayerStore((s) =>
  s.playlist.length > 0 && (s.loopMode !== 'off' || s.currentIndex < s.playlist.length - 1));
const hasPrev = usePlayerStore((s) =>
  s.playlist.length > 0 && (s.loopMode !== 'shuffle' || s.shuffleHistory.length > 0 || s.currentTime > 3));
```
（与现有 `computeView` 分支语义逐条对齐：off 时 next 受末位限制、其余恒 true；shuffle 时 prev 依赖历史栈或已播 >3s）

### 6.5 消费方迁移对照表（source of truth）

| 文件 | 现在 | 迁移后 |
| --- | --- | --- |
| `player/player-bar.tsx` | `useAudioPlayer()` 全量 + `audioPlayer.*` | 逐字段选择器（track/status/loopMode/volume/muted）+ **进度区拆给 `<SeekRow/>`**（见下）；动作 `usePlayerStore((s)=>s.action)` 或事件内 `usePlayerStore.getState().action()` |
| `player/now-playing-sheet.tsx` | `useAudioPlayer()` 全量 + `audioPlayer.*` | 同上；进度区一律 `SeekRow` |
| `player/mini-player.tsx` | `useAudioPlayer()` + `audioPlayer.*` | `s=>s.currentTrack`、`s=>s.status`、`s=>s.hasNext`(或直接用)、动作引用 |
| `player/music-player.tsx` | `useAudioPlayer()`（currentTrack） | `s=>s.currentTrack`（挂载门控）；`nowPlayingOpen` 保持本地 `useState` 不动 |
| `music/list-page.tsx` | `useAudioPlayer()` + `audioPlayer.play/toggle/removeTrack` | `s=>s.currentTrack`；动作引用 |
| `music/detail-page.tsx` | `useAudioPlayer()` + `audioPlayer.toggle/play/removeTrack` | `s=>s.currentTrack`、`s=>s.playlist`（对象引用稳定）；动作引用 |

**新增 `features/music/player/seek-row.tsx`**（UI 层、不属 store）：内部 `usePlayerStore(useShallow((s)=>({t:s.currentTime,d:s.duration})))`，渲染时间 + `TrackSlider` + 调 `seek`。目的：把每秒 4~10 次的时间 tick 隔离到这一个小组件，`PlayerBar`/`NowPlayingSheet` 不再订阅时间字段。

### 6.6 删除内容

`listeners` Set、`subscribe`、`getSnapshot`、`emit`、`computeView`、`view`、`AudioPlayerView`、`useSyncExternalStore`、`useAudioPlayer`。全仓 `useAudioPlayer` 调用点按 §6.5 清零（验收时 grep 兜底）。

## 七、Theme Store：`store/theme.ts`

- `create<{ mode: ThemeMode } & { setMode: (m: ThemeMode) => void }>()(...)`；`setMode` 内含 localStorage 写/删 + `paint` + 通知（zustand 原生通知，删手搓 `listeners`）。
- 模块加载挂 matchMedia `change` 监听（跟随系统天光），逻辑照搬现有 `darkMedia().addEventListener('change', ...)`。
- **STORAGE_KEY 保持 `'gf-admin-theme'`**——与 `index.html` 首帧引导脚本共用键，该契约不能变（改了会让深色用户先吃一帧白闪）。
- **顺带修正** `index.html` 中过期的注释 `src/app/theme/theme-provider.tsx`（实际文件早就是 `theme-store.ts`）→ 改为 `src/store/theme.ts`，避免误导后续维护者。
- 对外导出 `useThemeMode`/`setThemeMode`/`ThemeMode` 名字与语义不变。
- 消费方：`app/theme/theme-toggle.tsx` 仅把 import 从 `./theme-store.js` 改为 `@/store/theme.js`。

## 八、Article Editor Store：`store/article-editor.ts`（工厂 + React 绑定）

### 8.1 工厂（`zustand/vanilla` `createStore`）

```ts
export const createArticleEditorStore = (articleId: number | null) =>
  createStore<ArticleEditorState & ArticleEditorActions>()((set, get) => ({ ... }));
```

- `ArticleEditorState`：`article / draft / loading / loadError / phase / dirty / revision / conflict / restoreCandidate / versions / lastError`（初值照搬现有 `useState` 初值，含 `loading: articleId !== null`）。
- `ArticleEditorActions`：`sync / reload / updateDraft / flushNow / applyRestored / discardRestored / resolveConflict / loadVersions / restoreVersion / publish / unpublish / removeArticle / requestPreview`——逻辑逐行搬移，全部 `setState(...)` → `set({...})`、读 ref → `get()`。
- **防抖与单飞从 ref 改为工厂闭包变量**：`const scheduleSave = debounce(() => void get().persist(), 1000)`、`let saving = false; let pendingAgain = false;`——都放工厂闭包，不渲染、不镜像。`flushNow` 里 `scheduleSave.cancel()` 后 `await get().persist()` 语义不变。
- 一次性副作用唯一保留在 hook 的 mount effect：`void store.getState().reload()`。

### 8.2 React 绑定 hook（并入 `store/article-editor.ts`，无独立薄壳文件）

> **实施后复审调整（2026-08-04）**：原设计是独立的 `use-article-editor.ts` 薄壳。复审认定该文件是纯透传冗余——它真正的作用只有两点：`useMemo` 按 `articleId` 保实例（实例生命周期）、mount effect 触发 `reload()`。两者放进 `store/article-editor.ts` 同文件的 hook 即可，独立文件无存在价值。已删除 `features/articles/editor/use-article-editor.ts`，消费方仅改 import 路径。

```ts
export const useArticleEditor = (articleId: number | null) => {
  const store = useMemo(() => createArticleEditorStore(articleId), [articleId]);
  return {
    article: useStore(store, (s) => s.article),
    draft: useStore(store, (s) => s.draft),
    // ...逐字段订阅，与现有返回字段一一对应
    canPublish: /* 由 article/phase/dirty 三个原始值选择器组合，返回 boolean */,
    sync: useStore(store, (s) => s.sync),
    // ...动作逐个 useStore
  };
};
```

- 删除：6 个 `useRef`、5 个同步 effect、所有 `xRef.current = x` 双写、`useCallback`/`useMemo(debounce)` 包裹。
- 消费方：`workspace-page.tsx`（`editor.*`）、`inspector-pane.tsx`（`ReturnType<typeof useArticleEditor>` 类型）——仅将 import 改到 `@/store/article-editor.js`，返回形状不变。
- 卸载后迟到的防抖 flush 会读已卸载实例的 `get()`——与现状行为等价（现 hook 同样可能在卸载后触发一次保存），不作为缺陷。

## 九、Auth Store：`store/auth.ts`

### 9.1 store

- State：`AuthenticationState`（同款判别联合）+ `isSubmitting` + `isSigningOut`。
- Actions：`restoreSession / retry / signIn / signOut / useAnotherAccount`，及内部 `moveToGuardedState / handleAuthenticationRequired`；`messageFor` 助手随迁。`getAccessToken/setAccessToken` 从 `@/app/api/index.js` 导入（store 文件直接用它，逻辑照搬）。
- `restoreSession` 内的 `hasBootstrapped` 单飞逻辑**移到启动壳组件**（见下），避免双重引导。

### 9.2 `useAuth`（保持返回形状，稳定引用）

```ts
export const useAuth = () =>
  useAuthStore(useShallow((s) => ({
    state: s.state, isSubmitting: s.isSubmitting, isSigningOut: s.isSigningOut,
    retry: s.retry, signIn: s.signIn, signOut: s.signOut, useAnotherAccount: s.useAnotherAccount,
  })));
```
`useShallow` 保证：顶层字段为原语/稳定引用/稳定动作引用时返回同一对象，消费方不会被无关变更误触发。

### 9.3 启动壳 `app/providers.tsx`（保留 `AppProviders`）

```tsx
export const AppProviders = ({ children }: PropsWithChildren) => {
  const hasBootstrapped = useRef(false);
  useEffect(() => {
    apiClient.setSessionExpiredHandler(() => useAuthStore.getState().decideSessionExpired());
    if (hasBootstrapped.current) return;
    hasBootstrapped.current = true;
    void useAuthStore.getState().restoreSession();
  }, []);
  return <>{children}</>;
};
```
（`decideSessionExpired` 即现状 `handleAuthenticationRequired` 逻辑；引导时序、单飞、handler 注册与现在完全一致。`createContext`/`useContext`/`AuthContext` 全部删除。）

### 9.4 消费方（仅改 import 路径，行为/形状不变）

- `app/shell/admin-shell.tsx`：4 处 `useAuth`（`signIn`/`useAnotherAccount`/`retry`/`isSubmitting+state`），import `@/app/providers.js` → `@/store/auth.js`。
- `app/shell/console-shell.tsx`：1 处 `useAuth`（`isSigningOut/signOut/state`），同样改 import。
- `app/app.tsx`：仍包 `AppProviders`，不变。

## 十、明确不做（范围排除，防回归）

| 现状态 | 所在 | 处置理由 |
| --- | --- | --- |
| 列表页 `filters/page/reloadKey/prevRequestKey`（articles/assets/music 三处同构） | `list-page.tsx` ×3 | 页面实例局部状态；zustand 无收益，数据请求层明确不在本文范围 |
| 对话框开关与 `prevOpen` 渲染期重置 | `asset-picker/upload-dialog/edit-dialog` | 合法 React「按输入调整 state」官方模式，不是状态管理缺失 |
| 表单草稿 / 上传进度 / `nowPlayingOpen` | 各页面 | 瞬态交互，对照架构文档归「React 组件」层 |
| `use-keyboard-inset` / `use-media-query` | `hooks/` | 跟踪浏览器能力的订阅，与业务状态无关 |
| `ui/image.tsx` 失败态 | `ui/` | 组件私有瞬态 |
| API 数据请求层缓存/失效 | — | 架构文档明确数据层单独设计，本文不触碰 |

## 十一、风险与后顾

- **行为等价是被强约束的**：这是纯重构，任何功能差异都是回归。播放器时间状态机、MediaSession、编辑器保存状态机、认证分支全部原样搬移，仅去手搓订阅/ref 镜像、并加一层重渲染隔离。验收矩阵（§十二）逐项兜底。
- **react-compiler × zustand 选择器**：项目启用 react-compiler（CODE_STYLE），选择器**必须返回原始值或稳定引用**，组合取多字段一律 `useShallow`；否则出现「返回新对象 → 每次 store 变更无限重渲染」——这是本次最常见的踩坑点，实现阶段 6.4/8.2/9.2 已按此定型。
- **主题首帧契约**：`gf-admin-theme` 键与 `index.html` 引导脚本 双向依赖，任何一侧改动都必须同步另一侧；本文只迁 store 不动键名。
- **auth 启动时序**：`AppProviders` 必须继续包裹 `AdminShell` 并保证 `restoreSession` 只跑一次；若未来有人把 store 用在壳外，zustand 无 Provider 限制反而更宽松，但引导必须仍在壳内单飞（已把 `hasBootstrapped` 留在壳组件）。
- **旧文件残留**：`audio-player-store.ts`/`theme-store.ts` 删除后若漏改 import 会直接编译失败（Vite 报错，比静默更安全）；验收用 grep 兜底确认全仓无 `useSyncExternalStore`/`useAudioPlayer`/`audio-player-store` 残留（theme-store.ts 删除后 `theme-store` 引用清零）。

## 十二、验收与证据

静态门禁（TESTING.md 回归门）：

1. `pnpm typecheck && pnpm lint && pnpm build` 全绿。

行为矩阵（`pnpm dev:admin`，1440×900 与 375×780 × 明暗两模式；TESTING.md 的 agent 账号 `agent-admin`）：

2. **播放器**：
   - seek/volume/mute/循环四态（off/all/one/shuffle）/上一首下一首/删除当前曲目（skip 或 idle）/编辑当前曲目（播放不中断）跨路由常驻——与重构前逐项一致；
   - **重渲染隔离证据（开发期临时加，验证后移除）**：在 `player-bar.tsx` 与 `seek-row.tsx` 各放一个 `console.count('bar')`/`console.count('seek')`，播放中观察计数：`seek` 随 timeupdate 增长、`bar` 不增长。验证完成即删，不入库。
3. **编辑器**：输入触发自动保存（1s 防抖）；离线（关 API）编辑 → `offline` + idb-keyval 落盘 → 恢复后出现恢复提示并可 a) 恢复草稿 b) 丢弃；两人编辑触发冲突（`ARTICLE_STALE`） → 冲突弹窗 `keep-mine`/`take-server` 两路；发布/取消发布/版本列表/恢复版本/预览 token 门控——全部与重构前一致。
4. **主题**：三态切换即时生效；系统主题变化跟随（matchMedia）；刷新后模式保持；首帧无白闪（引导脚本仍先于 React 落地）。
5. **认证**：未登录 → 登录成功进站；`agent-user`（非 ADMIN）→ forbidden 屏；断 API → network-error 屏 + 重试；登出/换账号（useAnotherAccount）；会话过期（等 token 过期或伪造）→ 回未登录态。全部与重构前一致。
6. **残留兜底**：grep 全仓 `useSyncExternalStore`、`AuthContext`、`audio-player-store`、`theme-store` 无命中（除已定性「不迁」文件外）。
7. 证据以实施后本文件 §「验收证据」小节追加记录（日期/命令/结果）。

## 十三、实施任务拆分（按序，均待授权）

0. **阶段 0 依赖准入**：`pnpm-workspace.yaml` catalogs.admin 加 `zustand: ^5.0.14`；`apps/admin/package.json` 加 `zustand`；`pnpm install`；最小编译冒烟（一处 `create<...>()` 空 store 编译通过，确认 react-compiler 无冲突）。
1. **theme 迁移**：`store/theme.ts`（最小、隔离，先验证范式与 `useShallow` 手感）→ `theme-toggle.tsx` 改 import → 删 `theme-store.ts` → 修正 `index.html` 过期注释。
2. **player 迁移**：`store/player.ts`（state + 动作 + 副作用照搬）→ `features/music/player/seek-row.tsx` 新增 → 6 个消费方按 §6.5 对照表逐一迁移 → 删 `audio-player-store.ts`。
3. **article-editor 迁移**：`store/article-editor.ts`（createStore 工厂）→ `use-article-editor.ts` 改薄壳（逐字段 `useStore` + 唯一 mount effect）→ 验证 workspace-page/inspector-pane 零改动编译。
4. **auth 迁移**：`store/auth.ts` → `AppProviders` 收缩为启动壳 → `admin-shell.tsx`/`console-shell.tsx` 改 import。
5. **全量验收**：§十二 全矩阵人工过一遍 + 静态门禁 + 证据追加。

## 十四、与其他文档的同步

- `2026-08-04-music-library-slice.md` §7.1「不引入状态库」与非启用状态：本文实施后将 `audio-player-store.ts` 叙述替换为「播放器 store 为 zustand（见 `2026-08-04-admin-zustand-store-refactor.md`）」。
- `2026-08-01-admin-technology-stack.md` §状态边界：本文实施后在该节补一行注明依赖准入规则已触发（zustand@5 已准入，见本文 §一）。
- 如未来新增全局/领域状态：一律进 `src/store/`，默认 `create` 单例；只有实例级（每实体一份）才用 `createStore` 工厂 + 组件薄壳订阅。

## 验收证据（2026-08-04）

静态门禁：

1. `pnpm typecheck` — 绿（root `tsc --noEmit` + 5 个 workspace 包，含 apps/main `nuxt typecheck`；exit 0，约 9s）。
2. `pnpm lint` — 绿（4 个 lint 目标；apps/admin 初跑 2 条 better-tailwindcss 换行 warning，已修复后重跑 `pnpm --filter @grey-flowers/admin lint` 零告警零错误）。
3. `pnpm --filter @grey-flowers/admin build` — 绿（vite build，✓ built in 1.32s，仅 chunk 体积提示，非错误）。
4. 残留兜底（grep `apps/admin/src`）：`audioPlayer` / `useAudioPlayer` / `audio-player-store` / `theme-store` / `AuthContext` 全部清零；`useSyncExternalStore` 仅剩 `hooks/use-media-query.ts`（§十 明确不迁的浏览器能力订阅）。
5. **全 workspace `pnpm build` 未达绿**：仅 apps/main Nitro prerender `/rss.xml` 返回 500 —— 本地 Postgres 未运行（localhost:5432 `ECONNREFUSED`，且机器上并无已安装的 postgresql 服务，仅残留 brew opt 路径）。这是 TESTING.md 已记载的数据库前置依赖，与本次 admin-only 差分无关（git 状态确认改动仅覆盖 `apps/admin/*`、`pnpm-workspace.yaml`、`pnpm-lock.yaml`；contracts/db/api/main 均未触碰）。未擅自安装/启动系统级数据库服务。

无数据库的运行时冒烟（`pnpm --filter @grey-flowers/admin dev`，headless Chromium，1440×900）：

- 应用正常引导：`AppProviders` 启动壳注册会话过期 handler 并单飞一次 `restoreSession`；认证 store 经 `checking → network-error` 分支，`AdminShell` 渲染「网络错误」屏 —— 各迁移 store 模块级副作用（`new Audio()` + MediaSession 处理器、matchMedia 监听、zustand create）无任何页面错误（`pageerror` 数为 0，唯一 console error 为预期的 API `ERR_CONNECTION_REFUSED`）。
- 点击「重试」重新进入 `checking → network-error`（API 仍不可达），`retry` 动作经 store 正常链路。
- 首帧主题契约：写入 `localStorage['gf-admin-theme']='dark'` 后刷新，`documentElement.dataset.theme === 'dark'` 且 `colorScheme: dark`（index.html 引导脚本与 `store/theme.ts` 共用键未被破坏，无白闪路径变更）。

未执行的验收项（需 API + 数据库 + R2 资产，属 TESTING.md 人工矩阵，留给具备完整本地环境的人工验收）：

- 播放器 seek/volume/mute/循环四态/上下首/删除/编辑当前曲目 跨路由常驻；
- 重渲染隔离证据（`console.count('bar')` vs `console.count('seek')` 临时埋点，验证后移除）；
- 编辑器防抖自动保存 / 单飞 / 冲突 keep-mine|take-server / 离线 idb-keyval 恢复 / 发布 / 版本；
- 认证登录成功进站 / `agent-user` forbidden / 会话过期回未登录。

### 8.2 复审调整（同日，追加证据）

- 采纳「并入 store 文件」：`useArticleEditor` hook 移入 `store/article-editor.ts`（与工厂同文件），删除 `features/articles/editor/use-article-editor.ts`；`workspace-page.tsx` / `inspector-pane.tsx` 仅改 import 路径（`@/store/article-editor.js`），返回形状不变。
- 门禁复跑：`pnpm --filter @grey-flowers/admin typecheck` 绿、`pnpm --filter @grey-flowers/admin lint` 绿（tsc exit 0、oxlint exit 0 零告警）。
