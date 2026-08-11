# Admin 构建优化分析报告（2026-08-10）

> 范围：`apps/admin`（Vite 8 / Rolldown-vite 8.2.1 + React 19.2.8 + react-compiler）
> 方法：实际构建 + rollup-plugin-visualizer 模块级分析 + 对照实验（三种配置态对比）
> 参考：`/Users/nonhana/code_life/ApiPlayer/monorepo/apps/frontend` 的打包实践

## 1. 现状测量（`pnpm build:admin`）

### 1.1 构建输出与警告

- `✓ built in 3.52s`（另有 plugin timings 警告见 1.2）
- **警告 1**：3 个 chunk 超过 500 kB minified 默认警告线
- **警告 2**：`[PLUGIN_TIMINGS] 94% of 3.5s inside plugin hooks`——`@rolldown/plugin-babel transform (88%, 3.1s, 120 calls)`，即 react-compiler 的 babel 通道占满构建时间

### 1.2 主要 chunk（原始配置）

| chunk                     | raw       | gzip      | 加载时机                  | 内容                                   |
| ------------------------- | --------- | --------- | ------------------------- | -------------------------------------- |
| `index-Btapp6lu.js`       | 528.46 kB | 161.09 kB | **首屏**                  | React 全家桶（dev 版）+ router + shell |
| `ui-CbuyJ_IX.js`          | 643.98 kB | 197.27 kB | **首屏（modulepreload）** | react-aria + motion + zod + sonner 等  |
| `paper-theme-3ZNjaugV.js` | 620.58 kB | 212.59 kB | 懒加载（编辑文章）        | CodeMirror 全家桶                      |
| `list-page-B01V8V1c.js`   | 164.12 kB | 49.73 kB  | 懒加载（评论列表）        | react-aria/stately 二次引用            |
| 其余 ~60 个 chunk         | —         | —         | 懒加载                    | 路由页、music-metadata parser 等       |

总 JS 2278 kB；**入口 modulepreload 集合约 654 kB（gzip 约 324 kB）**。

## 2. 问题根因（按影响排序）

### 2.1 [P0] React 19 development 版被打进生产包 —— 实锤 877 kB 源码

visualizer 模块级分析显示生产产物包含：

```
791 kB  react-dom-client.development.js
 37 kB  react.development.js
 14 kB  react-dom.development.js
 10 kB  react-jsx-runtime.development.js + jsx-dev-runtime
  9 kB  scheduler.development.js
  3 kB  use-sync-external-store development ×2
  1 kB  react-compiler-runtime.development.js
———————
877 kB  development 模块（minify 后约 178 kB，全部落在 index chunk）
```

**根因**：React 19.2.8 的包入口是 CJS 转发器（`client.js` / `index.js` 内 `if (process.env.NODE_ENV === 'production') { require('./cjs/…production.js') } else { require('./cjs/…development.js') }`）。rolldown-vite 对 CJS 转发器内的 `process.env.NODE_ENV` 分支**未做静态折叠**，导致两个分支中的 dev 文件被解析进包。Vite 默认的 define 无法覆盖这一路径。

**对照实验**（三种配置态实测）：

| 配置态                                                     | dev 模块 | index chunk   | gzip          |
| ---------------------------------------------------------- | -------- | ------------- | ------------- |
| 原始配置                                                   | 877 kB   | 528.46 kB     | 161.10 kB     |
| + 显式`define: { 'process.env.NODE_ENV': '"production"' }` | **0 kB** | **350.45 kB** | **109.25 kB** |

一次 define 修复：**index chunk -178 kB（-34%），gzip -52 kB**。这是本轮发现的最大单项收益，成本一行配置。

### 2.2 [P1] 首屏 preload 集过大：ui chunk 644 kB 整块预加载

入口链上 shell / providers 直接依赖 react-aria、sonner、react-modal-sheet 等，`ui` chunk 被 `<link rel="modulepreload">` 全量预取。模块级构成（源码尺寸）：

```
331 kB  react-aria                ← 首屏 shell + ui/ 组件层大量使用
287 kB  motion + framer-motion    ← 源码 0 处直接 import！react-modal-sheet 的传递依赖
133 kB  zod                       ← @grey-flowers/contracts 值导入（运行时校验）
 92 kB  react-aria-components
 63 kB  cnfast
 58 kB  react
 43 kB  react-modal-sheet（自身）
 42 kB  react-stately
 41 kB  ky
```

要点：

- **motion 家族 287 kB 源码（minify 后约 77 kB / gzip 约 26 kB）只为 43 kB 的 react-modal-sheet 服务**。`react-modal-sheet@5.6.0` 硬依赖 `motion`。若用 react-aria-components 的 Dialog / react-aria 的 useDialog 重写移动端 sheet，可整体摘除，但属于行为重写，需评估。
- zod 133 kB 是共享契约的固有成本：`http.ts` 对 `apiFailureSchema` 等做运行时 `safeParse`。zod v4 core 本身已很难再压缩；除非契约层改为纯类型 + 服务端校验（降低客户端防御），否则接受。

### 2.3 [P2] CodeMirror 620 kB —— 已正确懒加载，无需动作

`paper-theme` chunk（@codemirror/view 318 + state 81 + lezer/javascript 79 + markdown 58 + autocomplete 59 + language 46 + …）只在进入文章编辑页时下载。分包正确。可选项：`@lezer/javascript` 79 kB 若 markdown 编辑不需要 JS 语法高亮，可从语言扩展中移除。

### 2.4 [P3] 构建慢：react-compiler 的 babel 通道

`@rolldown/plugin-babel`（`reactCompilerPreset`）3.1s / 120 calls 占构建 88%。这是 Vite 8 下 react-compiler 与 Rolldown 的既定集成方式（plugin-react v6 的 JSX 走 oxc，compiler 只能经 babel 注入，注释也说明「无重复转换」）。属于已知成本，暂不优化；可确认 `babel-plugin-react-compiler` 版本是否有缓存/更快通道。

### 2.5 [P4] 配置缺项

- 未设 `build.chunkSizeWarningLimit` → 500 kB 默认线天天报三个 chunk
- 未接入任何产物分析（visualizer）→ 体积问题只能靠肉眼
- 无 gzip/brotli 预压缩产物（见 §4.6 部署前提）

## 3. 与 ApiPlayer frontend 的对比

参考项目做法（`vite.config.ts`）：

| 做法                                                                         | 参考项目 | 对本项目是否适用                              |
| ---------------------------------------------------------------------------- | -------- | --------------------------------------------- |
| `manualChunks` 5 组（vue-vendor/ui-vendor/utils-vendor/monaco-editor/shiki） | ✅       | ⚠️ 见下方分析                                 |
| `chunkSizeWarningLimit: 1000`                                                | ✅       | ✅ 适用，消噪                                 |
| `vite-plugin-compression2` gzip 预压缩                                       | ✅       | ⚠️ 取决于 admin 部署方式                      |
| `rollup-plugin-visualizer` 常驻产出 stats.html                               | ✅       | ✅ 适用，建议                                 |
| monaco 只加载所需 languageWorkers                                            | ✅       | ✅ 思路已体现在 music-metadata 按 parser 分包 |

参考项目产物：`monaco-editor` 独立 chunk 3215 kB（gzip 826）、`ui-vendor` 234 kB、`index` 277 kB、`DashboardView` 342 kB。

**关键差异**：参考项目首屏依赖轻（vue + reka-ui），巨型的 monaco 靠懒加载隔离，manualChunks 只是把"必然要下载的"按缓存粒度分组；而 admin 的问题是**入口链本身太重**（shell 直接拖入 react-aria + motion + zod + sonner）。对照实验证明：

- 对 admin 加 `codeSplitting.groups`（react-aria-vendor 376 kB + motion-vendor 158 kB）：**总 JS 不变（2274 vs 2278 kB），但首屏 preload 集合 654 → 775 kB**——分包只是重组，不减肥；分组不当反而把懒加载页面的共享依赖提前拽进首屏。
- 结论：**manualChunks 解决的是缓存粒度，不是首屏体量**。admin 首屏减肥只能靠"移出入口链"（§4.3）或 define 修复（§4.1）。

## 4. 优化建议（按优先级）

### 4.1 [必做 · 已验证] 显式 define `process.env.NODE_ENV`

`apps/admin/vite.config.ts` 的 `define` 中追加：

```ts
define: {
  'import.meta.env.VITE_API_ORIGIN': JSON.stringify(apiOrigin),
  'import.meta.env.VITE_MAIN_ORIGIN': JSON.stringify(mainOrigin),
  'process.env.NODE_ENV': JSON.stringify('production'),
},
```

实测收益：index chunk 528.46 → 350.45 kB（-178 kB raw / -52 kB gzip），dev 版 React 全家桶归零。
建议同时在 CI/构建后校验产物不含 `development` 版 React（搜产物内 `react.development` / `scheduler.development` 特征）。

### 4.2 [必做 · 配置] 体积告警与可视化常态化

```ts
build: {
  chunkSizeWarningLimit: 1000,
},
```

并临时接入 `rollup-plugin-visualizer`（`gzipSize: true`，产物提交前跑一次看构成），与 §4.1 一起作为每次构建的体检手段。仓库现状无 visualizer 依赖，建议作为 devDependency 常驻（参考项目即常驻 + 产出 stats.html）。

### 4.3 [评估后做] 把 motion 移出入口链

- 背景：287 kB 源码的 motion/framer-motion 仅由 `react-modal-sheet` 引入，源码直接引用为 0。
- 选项 A：用 react-aria-components `Dialog` / react-aria `useDialog` 重写 `ui/overlay.tsx` 的移动端 sheet（依赖已在首屏，替换后 motion 可整体摘除，预计首屏 -77 kB raw / -26 kB gzip）。**行为重写，需回归移动端交互**。
- 选项 B：接受现状（motion 是成熟动画库，后续组件也可能用到）。
- 建议先做 A 的可行性 spike（`ui/overlay.tsx` 中 `BottomSheet` 的交互面：拖拽、滚动、虚拟键盘避让是 react-modal-sheet 的核心卖点，重写成本不低）。

### 4.4 [架构决策] contracts 的 zod 运行时

zod 133 kB 源自契约值导入（`safeParse` 防御）。若认同「客户端可信任已校验响应、仅服务端校验」，可把 admin 的响应校验降级为类型断言，摘除 zod —— 但会丢失 API 契约的运行时兜底，属安全权衡，需产品/架构拍板。默认建议：**保留**。

### 4.5 [低优先] 杂项

- `@lezer/javascript` 79 kB：确认 markdown 编辑是否需要 JS 语言支持，不需要则从 `lang-markdown` 扩展裁剪。
- react-compiler babel 3.1s：属既定集成成本，构建总时长 16s（含依赖安装），可接受；不必为此动架构。

### 4.6 [前提待确认] gzip/brotli 预压缩

`vite-plugin-compression2` 输出 `.gz`/`.br` 需 nginx 开启 `gzip_static`/`brotli_static` 才生效。**当前 `deploy.yml` 只部署 main 产物，admin 的部署方式未在仓库内体现**——先确认 admin 的托管方式（VPS nginx / Cloudflare Pages 等），再决定是否引入预压缩。Cloudflare 类 CDN 自带压缩，则不必。

## 5. 预期收益汇总

| 指标                   | 现状    | +§4.1            | +§4.1+§4.3(若做) |
| ---------------------- | ------- | ---------------- | ---------------- |
| 首屏 preload JS（raw） | ~654 kB | ~476 kB          | ~399 kB          |
| 首屏 gzip              | ~324 kB | ~271 kB          | ~245 kB          |
| >500 kB 警告 chunk     | 3 个    | 0 个（配合 4.2） | 0 个             |

## 6. 验证记录

- 三次实际构建：原始态、define 修复态、define+分包态，产物大小与 dev 模块统计均出自构建输出与 visualizer JSON 数据解析。
- 对照实验确认 define 修复与 dev 模块归零、chunk 缩小的因果关系（移除 define 即复现 877 kB dev 模块 + 528 kB index）。
- 临时文件（viz 配置、stats.html）已清理，未改动任何项目文件。
