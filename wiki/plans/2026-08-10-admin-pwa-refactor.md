# Admin PWA 化改造计划（SSOT）

## 状态与用途

- 决策日期：2026-08-10
- 状态：调研完成，关键决策已确认，待实施
- 文档类型：实施计划（Single Source of Truth）
- 读者：实施者（Nea / 后续会话）、维护者
- 关联文档：[Admin 技术栈设计](../design/2026-08-01-admin-technology-stack.md)、[React Frontend 架构设计](../design/2026-08-01-react-frontend-architecture.md)、[四个项目的身份定位](../design/2026-08-01-four-project-roles.md)、[后台运营工作流切片](../design/admin-operational-workflow-slices.md)

> 本文件是 `apps/admin` PWA 化改造的唯一事实来源。实现时一切以本文为准；若实现过程中发现本文与实际冲突，先改本文再改代码，不要悄悄偏离设计。切片文档把「Admin 路由、请求缓存、部署域名与预览环境」列为待专项设计的项——本文即该专项设计，将其确定为 PWA 化方案。

---

## 1. 目标

把 `apps/admin`（React + Vite SPA）改造为可在手机浏览器上安装、以独立窗口启动的 PWA：

- 安装为应用：Android Chrome「安装应用」、iOS Safari「添加到主屏幕」均可用，图标与名称正确；
- 离线可用：断网/弱网时应用外壳（shell）可冷启动，已打开的页面可阅读；
- 实时数据：运营数据的读取仍然实时走 API，**绝不**以缓存旧数据冒充新鲜状态（产品原则「State must be legible without being loud」「save she cannot trust」）；
- 更新可控：新版本发布后由操作者确认再刷新，不被 service worker 静默强制重载；
- 部署到位：`https://admin.caelum.moe` 静态托管（HTTPS），进入发布管道。

## 2. 现状与约束

### 2.1 Admin 现状（事实）

| 维度         | 现状                                                                                                                                                                                               |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 技术栈       | React 19 + Vite 8（Rolldown 内核）+ TanStack Router + Tailwind v4 + Zustand + ky                                                                                                                   |
| 移动端定位   | PRODUCT.md：「Mobile is a writing device」，手机是核心场景而非降级视图；`viewport-fit=cover` 已就绪                                                                                                |
| 离线基础     | `idb-keyval` 已用于文章草稿本地存储（`src/store/article-editor.ts`）；认证为「内存 access token + httpOnly refresh cookie」（`src/app/api/index.ts`）                                              |
| PWA 基建     | 零：无 manifest、无 service worker、无图标目录、无 theme-color                                                                                                                                     |
| 部署         | 不在任何发布管道：`.github/workflows/deploy.yml` 只构建并部署 `apps/main` 的 `.output`；admin 仅有本地 dev/build                                                                                   |
| 部署域名线索 | `apps/api/src/env.ts` 的 `productionOrigins` 已含 `https://admin.caelum.moe`（CORS 白名单已预留）；`apps/admin/vite.config.ts` production 模式 `VITE_API_ORIGIN` 硬编码为 `https://api.caelum.moe` |
| 品牌资产     | 主站有`favicon.svg`（Tabler 风格）；admin 无 `public/` 目录；强调色 petal-blue（浅色 `oklch(0.46 0.116 250)` = `#175A96`），画布色 `oklch(0.955 0.006 242)` = `#EDF1F4`                            |

### 2.2 硬门槛

Service Worker 只能在 secure context 注册（HTTPS 或 localhost）。admin 当前未部署，因此 **HTTPS 托管是本改造的前置条件**，与代码改造同步推进。

### 2.3 版本兼容性（已核实）

`vite-plugin-pwa@1.3.0`（2026-08 最新）peerDependencies 已含 `vite ^8.0.0`，与项目 Vite 8.2 兼容；内部依赖 `workbox-build@7.4.1`、`workbox-window@7.4.1`。无阻塞。

**实施发现（2026-08-10，两处已解决的非预期点）**：

1. **供应链信任拦截**：`workbox-build@7.4.1` 依赖 `@trickfilm400/rollup-plugin-off-main-thread@^3.0.0-pre1`（surma 原 OMT 插件的延续 fork，`GoogleChrome/workbox` 官方仓库 v7.4.1 的 `packages/workbox-build/package.json` 明确引用）。该预发布版无 provenance 证明，触发 pnpm `TRUST_DOWNGRADE`。已在 `pnpm-workspace.yaml` 的 `trustPolicyExclude` 按包名放行（与既有 `minimumReleaseAgeExclude` 同机制，属有注释的显式例外）。
2. **Rolldown 虚拟模块解析**：Vite 8（Rolldown 内核）下 `virtual:pwa-register/react` 无法从 pnpm 严格布局解析 `workbox-window`（`vite-pwa/vite-plugin-pwa#936`，官方建议 workaround）。已在 `pnpm-workspace.yaml` 增加 `publicHoistPattern: ['*workbox*']`。

## 3. 已确认的决策（决策记录）

| #   | 决策           | 内容                                                                                                                                                                                                                                                          |
| --- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | 部署拓扑       | VPS nginx 静态托管`https://admin.caelum.moe`（与主站同一台 VPS）；TLS 用 certbot。API CORS 白名单已含该域名，**无需改 `apps/api`**                                                                                                                            |
| D2  | 插件选型       | `vite-plugin-pwa@^1.3.0`（generateSW 模式，Workbox 内核）+ `@vite-pwa/assets-generator@^1.0.0` 图标生成                                                                                                                                                       |
| D3  | 图标来源       | 新设计专用图标，源图由用户提供（SVG 或 ≥512px PNG）；同一源图经生成器产出站点 favicon 与 PWA 全套图标                                                                                                                                                         |
| D4  | 缓存策略       | **只预缓存 app shell**（构建产物 JS/CSS/HTML/自托管字体）；**API 请求一律不缓存**（不配 runtimeCaching → Workbox 对未知请求默认 networkOnly）。理由：① 服务端是数据 SSOT，缓存旧数据会误导操作者；② 天然避免把带 `Authorization` 的响应或业务数据落进 SW 缓存 |
| D5  | 更新策略       | `registerType: 'prompt'`：检测到新版本后提示操作者「刷新以更新」，确认后才 `updateServiceWorker()`。不做 autoUpdate——避免编辑/保存过程中被 SW 突然 reload 丢状态                                                                                              |
| D6  | 主题色         | `theme_color: #175A96`（petal-blue 强调色）、`background_color: #EDF1F4`（浅色画布，贴近启动首帧底色）；`theme-color` meta 由 pwaAssets 集成自动注入 head（`injectThemeColor` 默认 true），`index.html` 不手写                                                |
| D7  | 外部资源不缓存 | Google Fonts（Noto Sans SC 分片投递）不做 SW 缓存：跨域缓存增加复杂度，离线时降级系统字体可接受（CJK 可读性不受影响）；JetBrains Mono 子集已在 dist 内、随 app shell 预缓存                                                                                   |
| D8  | iOS 专项       | iOS 不读 manifest icons，必须额外提供`apple-touch-icon`（180×180）与 `apple-mobile-web-app-*` meta；安装入口是「分享 → 添加到主屏幕」（无 `beforeinstallprompt`）                                                                                             |
| D9  | 名称           | `name: "Grey Flowers Admin"`、`short_name: "Grey Admin"`（≤9 字符避免被系统截断）、`lang: "zh-CN"`、`display: "standalone"`、`start_url`/`scope` 均为 `/`（相对路径，与部署子路径兼容）                                                                       |
| D10 | 更新提示 UI    | 用既有`sonner` toast 呈现：`offlineReady`（一次性「已可离线使用」）与 `needRefresh`（「新版本可用，刷新」+ 确认按钮）；挂载点在 `AppProviders` 内新建 `PwaBridge` 组件，不污染页面 feature                                                                    |

## 4. 目标结构（变更清单）

```
apps/admin/
├── package.json                 # + vite-plugin-pwa、@vite-pwa/assets-generator（devDependencies）
├── pwa-assets.config.ts         # 新增：图标生成预设（minimal-2023 输出全套）
├── public/                      # 新增目录（当前不存在）
│   ├── icon.svg                 # 用户提供的源图（favicon 由生成器从源图输出）
│   └── (favicon.ico / favicon.svg / pwa-*.png / maskable-*.png / apple-touch-icon-180x180.png，由 assets-generator 生成)
├── index.html                   # + apple-mobile-web-app-* iOS meta（theme-color / favicon / apple-touch-icon links 由插件构建时注入）
├── vite.config.ts               # + VitePWA 插件（manifest + generateSW + pwaAssets）
└── src/
    ├── vite-env.d.ts            # + /// <reference types="vite-plugin-pwa/client" />
    └── app/
        ├── pwa.tsx              # 新增：useRegisterSW 桥接 + sonner 提示
        └── providers.tsx        # + <PwaBridge />
pnpm-workspace.yaml              # catalogs.admin + vite-plugin-pwa、@vite-pwa/assets-generator
.github/workflows/deploy.yml     # + admin 产物打包/上传/nginx reload
VPS nginx                        # admin.caelum.moe 站点配置（仓库内留一份 admin.conf 参考，见 5.6）
```

## 5. 逐文件规格

### 5.1 依赖

`pnpm-workspace.yaml` 的 `catalogs.admin` 增加：

```yaml
'vite-plugin-pwa': ^1.3.0
'@vite-pwa/assets-generator': ^1.0.0
```

`apps/admin/package.json` 的 `devDependencies` 增加（catalog 引用）：

```json
"@vite-pwa/assets-generator": "catalog:admin",
"vite-plugin-pwa": "catalog:admin"
```

均为构建期工具，不进入运行时依赖。

### 5.2 图标源图规范与生成

**源图要求（用户提供）**：**推荐 SVG**（任意尺寸无损缩放，且是唯一能产出 SVG favicon 的源格式）；若提供 PNG 需 ≥512×512。主体图形居中且直径不超过画布的 80%（maskable 安全区要求，Android 自适应图标会裁剪边缘）。正方形源图最佳（`fit: contain` 等比缩放，非正方形会在画布内留白）。

**已确认的源图（2026-08-10 用户提供）**：`apps/admin/public/logo.png`（1408×1408 正方形 RGB PNG，满足 ≥512×512 要求）。PNG 源 → 生成器**不产出** `favicon.svg`（仅 SVG 源才复制产出），站点 favicon 只有 `favicon.ico`，见下方产物表。

源图存放：`apps/admin/public/logo.png`。站点 favicon 由生成器从源图输出（`favicon.ico`），`index.html` 不直接引用源图。

> 注：该源图主体占满画布，maskable 安全区（中央 80%）可能不足；生成后需目检 `maskable-icon-512x512.png` 与 `apple-touch-icon-180x180.png`，若裁剪观感不可接受，需用户后续提供留白更充分的版本（不阻塞本轮改造）。

`apps/admin/pwa-assets.config.ts`（新增）：

```ts
import {
  defineConfig,
  minimal2023Preset,
} from '@vite-pwa/assets-generator/config';

export default defineConfig({
  preset: minimal2023Preset,
  images: ['public/logo.png'],
});
```

`minimal-2023` preset 输出（全部进 `public/`）：

| 文件                           | 用途                                      |
| ------------------------------ | ----------------------------------------- |
| `favicon.ico`                  | 站点 favicon（48×48 透明底）              |
| `favicon.svg` | 站点 SVG favicon（透明底，`sizes="any"`）；**仅 SVG 源图时生成**（直接复制源图），PNG 源图不产出该文件 |
| `pwa-64x64.png`                | 兼容小尺寸                                |
| `pwa-192x192.png`              | manifest any 图标                         |
| `pwa-512x512.png`              | manifest any 图标                         |
| `maskable-icon-512x512.png`    | manifest maskable 图标                    |
| `apple-touch-icon-180x180.png` | iOS 安装图标                              |

> preset 具体产物以 `@vite-pwa/assets-generator@1.x` 实际输出为准；实施时若文件名不同，同步更新 manifest 配置与插件 head 注入结果。生成结果必须 git 提交（图标是品牌资产，不应每次构建依赖生成器）。

### 5.3 vite.config.ts

在 `plugins` 数组追加：

```ts
import { VitePWA } from 'vite-plugin-pwa';
```

```ts
VitePWA({
  registerType: 'prompt',
  pwaAssets: {
    // 读取 pwa-assets.config.ts；build 时生成图标、注入 manifest icons，
    // 并默认注入 head 中的 favicon/apple-touch-icon links 与 theme-color meta
    // （includeHtmlHeadLinks 与 injectThemeColor 默认均为 true）
    config: true,
  },
  manifest: {
    name: 'Grey Flowers Admin',
    short_name: 'Grey Admin',
    description: 'Grey Flowers 运营工作台',
    lang: 'zh-CN',
    display: 'standalone',
    start_url: '/',
    scope: '/',
    theme_color: '#175A96', // 由插件注入 html head（injectThemeColor）
    background_color: '#EDF1F4',
    // icons 由 pwaAssets 自动注入，不手写
  },
  workbox: {
    navigateFallback: '/index.html', // SPA：未知路径回退到 app shell
    // 不配置 runtimeCaching：API 请求（/auth、/articles 等）与外部字体一律 networkOnly，不缓存
    // globPatterns 保持插件默认（构建产物即 app shell）
  },
  devOptions: {
    enabled: false, // 开发模式不启用 SW，避免调试干扰；PWA 验证走 build + preview
  },
});
```

关键语义（对应 D4/D5）：

- `registerType: 'prompt'` → 新版本只提示不强制（经 `virtual:pwa-register` 集成注册，注册逻辑内联进构建产物，不产出独立 `registerSW.js`）。
- 不配置 `runtimeCaching` → Workbox 只处理预缓存清单（app shell），其余请求直连网络。API 响应、`Authorization` 头、业务数据**不会**进入任何缓存。
- `navigateFallback` 仅作用于同源导航请求；API 是跨源（`https://api.caelum.moe`），不受影响。

### 5.4 index.html

`<head>` 中追加（保持现有注释风格，中文注释）：

```html
<!-- PWA：iOS 安装 meta（manifest、theme-color、favicon/apple-touch-icon links 由 vite-plugin-pwa 构建时自动注入） -->
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="Grey Admin" />
```

说明：

- `viewport-fit=cover` 已存在（safe-area 适配已就绪），不要改动。
- **不要手写** `theme-color` meta、`<link rel="icon">`、`<link rel="apple-touch-icon">`：`pwaAssets` 集成默认注入它们（`includeHtmlHeadLinks` 与 `injectThemeColor` 默认 `true`，manifest 的 `theme_color` 会同步进 head）。手写会与注入重复。
- iOS 私有 meta（`apple-mobile-web-app-*`）插件不生成，必须手写；`apple-mobile-web-app-status-bar-style: default` 跟随系统明暗，不做强制黑/白——与项目「雾化中性、不喧宾夺主」的视觉纪律一致。

### 5.5 App 集成（更新提示）

`src/vite-env.d.ts` 顶部追加：

```ts
/// <reference types="vite-plugin-pwa/client" />
```

`src/app/pwa.tsx`（新增，约 30 行）：

```tsx
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useEffect } from 'react';
import { toast } from 'sonner';

/**
 * PWA 桥接：离线可用提示（一次性）与新版本确认刷新提示。
 * 更新采用 prompt 模式（见 wiki/plans/2026-08-10-admin-pwa-refactor.md D5）：
 * 只提示、不强制，避免编辑/保存过程中被 service worker 突然 reload。
 */
export const PwaBridge = () => {
  const { offlineReady, needRefresh, updateServiceWorker } = useRegisterSW();

  useEffect(() => {
    if (offlineReady) {
      toast.success('已可离线使用');
    }
  }, [offlineReady]);

  useEffect(() => {
    if (!needRefresh) return;
    toast('新版本可用', {
      action: {
        label: '刷新',
        onClick: () => updateServiceWorker(true),
      },
      duration: Infinity,
    });
  }, [needRefresh, updateServiceWorker]);

  return null;
};
```

`src/app/providers.tsx`：在 `AppProviders` 的组合内挂 `<PwaBridge />`（与既有 Provider 并列）。PWA 属于应用级 runtime，放在 `app/` 层符合 [React Frontend 架构设计](../design/2026-08-01-react-frontend-architecture.md) 的归属纪律（`app/` 只放会话、导航与真正跨 feature 的运行时组合）。

> toast 文案与交互以实施时 DESIGN.md 为准微调；状态语义（saving/saved/offline/conflict）已由 DESIGN.md 的 status readout 覆盖，PWA 提示不与其冲突。

### 5.6 部署（nginx + TLS + 发布管道）

**前置假设（实施时需现场确认）**：VPS 上已有 nginx 与 certbot（主站 `https://caelum.moe` 依赖它们）；若无则先补齐。

**DNS**：`admin.caelum.moe` A 记录指向 VPS IP（实施者无权限则请用户在 DNS 侧配置，可复用主站所在 Cloudflare 面板）。

**nginx 站点**（仓库内新增 `apps/admin/nginx-admin.conf.example` 供参考与部署；实际生效配置在 VPS）：

> 实施确认：本项目通过 `virtual:pwa-register` 集成注册，`injectRegister` 自动关闭，**不产出 `registerSW.js`**（注册逻辑内联进构建产物）。nginx 只需对 `sw.js` 与 `manifest.webmanifest` 设 no-cache；示例配置不含 `registerSW.js` 条目。

```nginx
server {
  listen 443 ssl http2;
  server_name admin.caelum.moe;

  # certbot 签发：certbot --nginx -d admin.caelum.moe
  # TLS 证书路径由 certbot 自动填入

  root /srv/grey-flowers/admin/dist;
  index index.html;

  # SPA：未知路径回退 app shell
  location / {
    try_files $uri $uri/ /index.html;
  }

  # service worker 与 manifest 禁止强缓存（必须能感知新版本）
  location = /sw.js {
    add_header Cache-Control 'no-cache';
  }
  location = /registerSW.js {
    add_header Cache-Control 'no-cache';
  }
  location = /manifest.webmanifest {
    add_header Cache-Control 'no-cache';
    add_header Content-Type 'application/manifest+json';
  }

  # 带内容 hash 的构建产物可长缓存（Vite 默认文件名含 hash）
  location /assets/ {
    expires 1y;
    add_header Cache-Control 'public, immutable';
  }
}
```

**发布管道**：扩展 `.github/workflows/deploy.yml`（与 main 同一次部署）：

1. `Prepare artifact directory` 步骤追加：`mkdir -p .deploy/admin && cp -r apps/admin/dist/. .deploy/admin/`（现有 `scp .deploy/**` 自动携带）。
2. SSH 步骤追加：`mkdir -p $VPS_DIR/admin && rm -rf $VPS_DIR/admin/* && mv .deploy/admin/* $VPS_DIR/admin/`，随后 `nginx -t && systemctl reload nginx`（或 `nginx -s reload`，以 VPS 实际服务方式为准）。
3. admin 构建无需额外 env：`vite build` 默认 production 模式，`VITE_API_ORIGIN`/`VITE_MAIN_ORIGIN` 在 `vite.config.ts` 中对 production 硬编码为线上域名。
4. nginx 站点文件首次部署需人工落位（VPS 上 `sites-available` + `sites-enabled` 软链 + `certbot` 签发），之后随管道只更新 `dist/` 内容。

## 6. 实施顺序

1. **用户提供图标源图**（外部依赖，阻塞 2/3）——SVG 或 ≥512px PNG。
2. 依赖与 catalog：`vite-plugin-pwa`、`@vite-pwa/assets-generator`。
3. `pwa-assets.config.ts` + 源图落位 `public/icon.svg` → 跑一次生成器，确认全套图标产物并提交。
4. `vite.config.ts` 接 `VitePWA`（manifest + generateSW + pwaAssets）。
5. `index.html` PWA/iOS meta + favicon/apple-touch-icon。
6. `vite-env.d.ts` 类型引用 + `PwaBridge` + `providers.tsx` 挂载。
7. 本地验证（见 7.1）。
8. VPS：DNS → nginx 站点 → certbot TLS → 首部署（人工）。
9. `deploy.yml` 扩展，进入发布管道。
10. 真机验证（见 7.2）。

## 7. 验收标准

### 7.1 本地（build + preview，localhost）

- `pnpm build`（admin）产物包含：`sw.js`、`manifest.webmanifest`、全套图标 PNG、`index.html` 注入的 manifest link 与 PWA meta（注册经虚拟模块内联，无独立 `registerSW.js`）。
- `pnpm -F @grey-flowers/admin preview` 后 Chrome DevTools → Application 面板：Manifest 有效、Service Worker 注册成功、无 installability 报错。
- 断网（DevTools offline）刷新：app shell 正常加载；API 请求明确失败并走既有错误 UI（不出现缓存旧数据）。
- 触发一次新版本（改产物再 build/preview）：出现「新版本可用」提示，确认后刷新到新版本。
- `pnpm typecheck && pnpm lint`（admin）通过。

### 7.2 真机（部署后，`https://admin.caelum.moe`）

- Android Chrome：可「安装应用」，图标为品牌图标，standalone 全屏启动；断网冷启动可打开 shell；新版本提示出现。
- iOS Safari：「分享 → 添加到主屏幕」，图标为 `apple-touch-icon`，standalone 启动、safe-area 正常（刘海/底部横条不遮挡）。
- 登录态：安装应用内登录/续期正常（httpOnly cookie 随同源请求携带）。
- 数据实时性：正常联网时数据始终来自 API；断网时呈现明确失败态。
- 安全抽查：DevTools → Cache Storage 中仅见 app shell 资源，无 API 响应体、无含 `Authorization` 的条目。

## 8. 待用户提供 / 不在本文决定

- **图标源图**——✅ 已于 2026-08-10 提供：`apps/admin/public/logo.png`（1408×1408 PNG）。maskable 安全区观感待生成后目检，若需留白更充分的版本属后续优化，不阻塞实施。
- **VPS 现场确认**：nginx 与 certbot 是否已就绪、nginx 服务方式（systemd/直接进程）。
- **DNS 配置**：`admin.caelum.moe` A 记录（用户有 Cloudflare 面板权限可自行配置）。
- 图标的具体视觉设计由用户提供，本文不定义图形方案。
- 若实施中发现 `@vite-pwa/assets-generator@1.x` 的 preset 输出文件名与本文 5.2 不一致，以实际输出为准并回改本文与引用。
