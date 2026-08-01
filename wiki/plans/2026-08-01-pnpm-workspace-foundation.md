# pnpm 工作区基础建设方案

## 状态

- 决策日期:2026-08-01
- 状态:已批准,待实施
- 分支:`feature/admin-monorepo`
- 范围:把现有 Nuxt 仓库改造成标准的 pnpm 工作区,并确立 `packages/db` 作为 Prisma 的唯一持有者。

本文档是这次「工作区基础建设」工作的唯一权威来源。它刻意把范围限定在**仓库结构**和**现有主站行为**上。那个已废弃的 legacy admin 仓库既不是输入、也不是依赖、更不是迁移目标。

## 目标

让仓库为将来引入 React admin 和 Hono API 做好准备,但**不改变**公开站点的路由、数据库数据、Prisma schema、迁移记录、认证行为或部署目标。

最终状态是一个工作区根、一个 Nuxt 应用、一个可复用的数据库包:

```text
.
├── apps/
│   └── main/
│       ├── app/
│       ├── public/
│       ├── server/
│       ├── shared/
│       ├── ecosystem.config.cjs
│       ├── eslint.config.mjs
│       ├── golar.config.ts
│       ├── nuxt.config.ts
│       ├── package.json
│       ├── tsconfig.json
│       └── uno.config.ts
├── packages/
│   └── db/
│       ├── prisma/
│       │   ├── generated/
│       │   ├── migrations/
│       │   └── schema.prisma
│       ├── src/
│       ├── package.json
│       ├── prisma.config.ts
│       └── tsconfig.json
├── agent-docs/
├── scripts/
├── .github/
├── .env.example
├── package.json
└── pnpm-workspace.yaml
```

`apps/main` 的包名是 `@grey-flowers/main`；`packages/db` 的包名是 `@grey-flowers/db`。

## 非目标(明确不做的事)

- **不**添加 React、Vite、Hono、OpenAPI、认证替换或 admin UI。
- **不**创建 `packages/contracts`、`packages/shared`、`packages/ui` 或任何面向未来的目录。
- **不**改动 `prisma/schema.prisma`、迁移 SQL、生成的客户端内容、数据库数据、R2 对象或生产凭据。
- **不**运行 `prisma db push`、`prisma migrate deploy` 或任何远程部署操作。
- **不**升级包版本。保留当前 lockfile 里的版本,只调整「每个包在哪个位置声明这些版本」。
- **不**从 `/Users/nonhana/code_life/blog/admin-monorepo` 引入任何代码、配置、依赖或约定。

## 不变的约束(Invariants)

1. 公开 Nuxt 站点保持现有的 SSR、SEO、RSS、MDC 渲染、Nitro 路由以及 PM2 部署形态。
2. `Article.content` 仍是原始的 Markdown/MDC 源文本；`Comment.contentMarkdown` 保持其持久化的 JSON 语义。
3. `pg_trgm` 扩展以及现有的部分索引/全文文章索引,仍然由同一份已提交的迁移 SQL 来呈现。
4. 阶段 2 之后,**只有** `packages/db` 拥有 Prisma schema、迁移、生成的客户端、Prisma 配置和数据库包版本。
5. `apps/main` 只能通过 `@grey-flowers/db` 包访问 Prisma,**不得**用文件系统路径直接 import `prisma/generated/*`。
6. `packages/db` 内**不包含**任何应用环境校验、请求处理、授权、查询策略或业务写操作逻辑。它只对外暴露 Prisma 基础设施。
7. `apps/main/shared` 保持 Nuxt 本地私有。它目前只有一个调用方；把它抽成通用工作区包,会制造一种没有支撑的抽象。

## 依赖目录(Catalogs)

pnpm 称这些版本分组为「catalogs(目录)」。请在 `pnpm-workspace.yaml` 中保持 `catalogMode: prefer`、`cleanupUnusedCatalogs: true`,以及现有的供应链安全设置。

默认的 `catalog` 只用于跨工作区共享的工具链依赖:

- `typescript`
- `eslint`
- `@antfu/eslint-config`
- `@types/node`

再添加以下具名 catalog:

| Catalog | 内容 | 使用者 |
| --- | --- | --- |
| `main` | Nuxt、Vue、Vue Router、Nuxt 模块、UnoCSS、Pinia、VueUse、站点渲染、邮件、认证、Markdown、动画,以及主站专用的开发依赖 | `@grey-flowers/main` |
| `db` | `prisma`、`@prisma/client`、`@prisma/adapter-pg`、`pg`、`@types/pg` | `@grey-flowers/db` |

`apps/main/package.json` 对主站依赖使用 `catalog:main`,对通用工具链使用默认 `catalog:`。`packages/db/package.json` 对数据库依赖使用 `catalog:db`,对通用工具链使用默认 `catalog:`。根 `package.json` **不**有任何应用运行时依赖。

**不要**在对应的工作区包真正存在之前就添加 `admin` 或 `api` catalog——否则 `cleanupUnusedCatalogs` 会把它删掉,而且一份未来的依赖清单本身就是未经验证的承诺。

## 包接口

`@grey-flowers/db` 只有一个公开接口:

- 重新导出调用方需要的、由 Prisma 生成的客户端类型,包括 `Prisma` 以及 Nuxt server 当前用到的 model/input 类型。
- 导出 `createPrismaClient(connectionString)`,它负责创建 `PrismaPg` 和 `PrismaClient`。

`apps/main/server/utils/prisma.ts` 保持为「组合根(composition root)」。它通过现有的主站环境模块校验 `HANA_DATABASE_URL`,调用 `createPrismaClient`,并掌管主站的单例生命周期。现有的查询辅助函数、序列化器、以及 API 路由行为都继续留在 `apps/main/server/`。

这种拆分让未来的 Hono 应用能拿到同一个客户端工厂,却**不**共享 Nuxt 的单例、请求策略或数据库写入。

## 环境变量与命令

把被 git 忽略的本地 `.env` 和纳入版本控制的 `.env.example` 放在**工作区根目录**。在出现各自可独立运行的应用之前,它始终保持为唯一的本地开发环境文件。

每个需要本地环境变量的包内命令,都使用 Node 24 支持的 `--env-file-if-exists=../../.env` 标志。包脚本从各自的包目录运行,所以这个路径会解析到工作区根文件;在 CI 或生产环境中,该文件不存在、变量由环境注入,此标志只会有害无益(null 操作),因此是安全的。

对 Nuxt 命令,`@grey-flowers/main` 通过已验证的包内入口调用:`node --env-file-if-exists=../../.env ./node_modules/nuxt/bin/nuxt.mjs <command>`。对 Prisma 命令,阶段 1 的临时 main 包和阶段 2 的 `@grey-flowers/db` 都通过 `node --env-file-if-exists=../../.env ./node_modules/prisma/build/index.js <command>` 调用。这样让包脚本不依赖 pnpm 的提升(hoisting)行为。

根命令保持为稳定的运维接口:

| 根命令 | 委托给 |
| --- | --- |
| `pnpm dev` | `@grey-flowers/main` 开发服务器 |
| `pnpm build` | 按依赖顺序构建整个工作区,最后是 `@grey-flowers/main` |
| `pnpm typecheck` | 所有工作区 `typecheck` 命令 |
| `pnpm lint` | 所有工作区 `lint` 命令 |
| `pnpm prisma:generate` | `@grey-flowers/db` 的 generation 命令 |
| `pnpm prisma:push` | `@grey-flowers/db` 仅限本地的 push 命令 |
| `pnpm prisma:migrate:deploy` | `@grey-flowers/db` 的 deploy 命令 |
| `pnpm prisma:studio` | `@grey-flowers/db` 的 studio 命令 |

`apps/main` 包保持当前的 `dev`、`build`、`generate`、`preview`、`analyze`、`typecheck`、`lint`、`prepare` 等语义。它的 Nuxt CLI 脚本显式携带根本地环境文件运行。`packages/db` 拥有 `prisma:generate`、`prisma:push`、`prisma:migrate:deploy`、`prisma:studio`。

仅阶段 1 期间,根 `prisma:*` 命令委托给 `@grey-flowers/main`(因为那时 Prisma 目录还在那里)；阶段 2 把委托目标改为 `@grey-flowers/db`。根命令的名称及其对运维人员的含义**不变**。

## 实施阶段

每个阶段都可以独立合并,并且每个阶段结束时公开站点都必须保持可运行。

### 阶段 1:把仓库根改造成工作区

**目的:** 搬迁 Nuxt 应用,但暂不改动它如何持有 Prisma。

1. 新增 `apps/main/package.json`:`@grey-flowers/main`、`private: true`、ESM、当前 Node 与 pnpm 引擎范围,以及把现有全部应用依赖通过默认 catalog 或 `catalog:main` 表达。
2. 用 `git mv` 把以下路径迁入 `apps/main/`:`app/`、`public/`、`server/`、`shared/`、`nuxt.config.ts`、`uno.config.ts`、`golar.config.ts`、`eslint.config.mjs`、`tsconfig.json`、`prisma/`、`prisma.config.ts`、`ecosystem.config.cjs`。`server/tsconfig.json` 随 `server/` 一起移动,不能移动第二次。
3. 根持有的仓库产物留在根:`.github/`、`agent-docs/`、`scripts/`、`README.md`、`PRODUCT.md`、`DESIGN.md`、`DESIGN.json`、`LICENSE`、`.env.example`、`package.json`、`pnpm-lock.yaml`、`pnpm-workspace.yaml`。
4. 修改 `pnpm-workspace.yaml` 纳入 `apps/*` 和 `packages/*`,保留现有全部 pnpm 安全设置,并把扁平的「应用 catalog」替换为「默认工具链 catalog + `catalogs.main`」。
5. 把根 `package.json` 的应用清单替换成私有的工作区编排器:其脚本委托给各包脚本,**不**内联执行 Nuxt、Prisma 或 ESLint 的实现命令。
6. 搬迁后更新 Nuxt 的包相对路径。Nuxt 4 的 `~` 仍解析到 `apps/main/app`,`~~` 现在解析到 `apps/main`；本阶段在 Prisma 仍位于 main 包内期间,保留所有现有的 `~~/prisma/generated/*` 导入。
7. 更新 `.github/workflows/deploy.yml`:继续使用根的 `pnpm install --frozen-lockfile` 和 `pnpm build`,但要把 `apps/main/.output` 和 `apps/main/ecosystem.config.cjs` 放进现有的 `.deploy` 产物布局。VPS 继续在其部署根接收 `.output` 和 `ecosystem.config.cjs`。
8. 把 workflow 的 Node 版本从 `24.12.0` 改为 `24.18.0`,与仓库在 `engineStrict` 下声明的 `>=24.18.0 <25.0.0` 引擎范围对齐。
9. 更新根目录的 build、架构、数据库、测试、README 和 AGENTS 文档,使其描述新的工作区路径,并**明确记录 Prisma 尚未移动到 `packages/db`**。

**阶段 1 检查:**

```sh
pnpm install
pnpm install --frozen-lockfile
pnpm prisma:generate
pnpm typecheck
pnpm lint
pnpm build
test -f apps/main/.output/server/index.mjs
```

用完整的现有本地环境启动 `pnpm dev`,手动加载首页、一篇文章页、`/rss.xml` 和一个现有的 Nitro API 端点。此冒烟测试**不要**做任何数据库写操作。

**回滚:** 回退阶段 1 的提交即可。该阶段不改变任何数据、迁移、对象存储或部署状态。

### 阶段 2:抽出 `packages/db` 并替换文件系统级的 Prisma 导入

**目的:** 让数据库基础设施可复用,同时保持 Nuxt 行为不变。

1. 新增 `packages/db/package.json`、`packages/db/tsconfig.json`、`packages/db/src/index.ts`。该包为 `@grey-flowers/db`、私有、ESM,只声明默认工具链 catalog 加 `catalog:db` 依赖。
2. 用 `git mv` 把 `apps/main/prisma/` 移到 `packages/db/prisma/`,把 `apps/main/prisma.config.ts` 移到 `packages/db/prisma.config.ts`。**逐字节原样保留** `migration_lock.toml`、两个迁移目录、以及已检入的生成的客户端。
3. Prisma 生成产物保持在 `packages/db/prisma/generated/`。**绝不手动编辑它。** 更新 Prisma 配置的 schema 位置为 `prisma/schema.prisma`,并继续把 `HANA_DATABASE_URL` 作为唯一的数据源输入。
4. 实现上文「包接口」中描述的**狭窄** `@grey-flowers/db` 导出。在 Nuxt 构建之前,先把包源码编译到它自己的 `dist/` 输出。
5. 在 `apps/main/package.json` 加入 `@grey-flowers/db: workspace:*`。把当前 main server 里的所有 `~~/prisma/generated/*` 导入替换为 `@grey-flowers/db` 导入。涉及文件:`server/utils/prisma.ts`、`server/utils/prismaShortcut.ts`、activity/comment 序列化器、article 列表/计数路由、comment 提交路由、user 编辑路由。
6. 保留 `apps/main/server/utils/prisma.ts` 作为唯一的 main-site 客户端单例；重构它以调用 `createPrismaClient(env.HANA_DATABASE_URL)`。
7. 更新 `apps/main/nuxt.config.ts`,让 Nitro 把 `@grey-flowers/db` 内联进可部署的 main 输出。部署模型只复制 `.output`,所以工作区符号链接**不能**成为生产运行时依赖。
8. 把根 `prisma:*` 脚本改指向 `@grey-flowers/db`；把全部 Prisma 依赖和 Prisma 生命周期工作从 `@grey-flowers/main` 中清除。
9. 更新阶段 1 添加的文档:`packages/db` 现在是 schema、迁移、生成的客户端和 Prisma 版本的唯一持有者。记录:Hono 目前还不是写入方,Nuxt 行为不变。

**阶段 2 检查:**

```sh
pnpm install
pnpm install --frozen-lockfile
pnpm prisma:generate
pnpm typecheck
pnpm lint
pnpm build
test -f apps/main/.output/server/index.mjs
```

然后用完整环境启动构建好的 main 应用,请求一个能触达 Prisma 的页面(如文章详情路由),再请求 `/rss.xml`。这一步验证 Nitro 把内部数据库包及其 Prisma 运行时依赖都打进了 `.output`。

合并前,检查 diff,确认 `packages/db/prisma/schema.prisma` 和每份迁移 SQL 文件都是**纯重命名、无语义改动**。除 `prisma generate` 之外,**不要**运行任何迁移命令。

**回滚:** 回退阶段 2 的提交。之前的阶段 1 应用仍然可运行,且仍拥有其原始 `apps/main/prisma/` 目录。

### 阶段 3:确立未来的扩展边界

**目的:** 让仓库对后续 admin/API 工作状态明确,同时不添加任何一个应用。

1. 在 `agent-docs/ARCHITECTURE.md` 添加最终架构章节:`apps/main` 是公开的 Nuxt 渲染器;`packages/db` 是共享数据库基础设施;未来的 `apps/admin` 和 `apps/api` 必须是独立包。
2. 在 `agent-docs/DATABASE.md` 添加最终数据库章节:Prisma 的 schema/迁移/客户端生成**专属** `packages/db`;应用只消费其公开包接口,不得伸进 `prisma/generated`。
3. 用稳定的根命令和正确的 `apps/main/.output` 产物路径,更新 `agent-docs/BUILD.md`、`agent-docs/TESTING.md`、README 和根 `AGENTS.md`。
4. 确认本次基础建设**没有**引入任何通用共享包或未来的依赖 catalog。

**阶段 3 检查:**

```sh
pnpm typecheck
pnpm lint
pnpm build
rg -n "~~/prisma/generated|apps/main/prisma|^prisma/" apps packages package.json pnpm-workspace.yaml agent-docs README.md
```

这次搜索必须:没有 `~~/prisma/generated` 的源码导入、没有旧的「应用持有 Prisma」路径、没有过时的文档命令/路径。允许出现指向 `packages/db/prisma` 的预期引用。

**回滚:** 回退仅改文档的阶段 3 提交。运行时行为和持久化状态不受影响。

## 部署契约

仓库继续只部署公开 Nuxt 应用。workflow 必须:

1. 用 `pnpm install --frozen-lockfile` 安装整个工作区;
2. 运行根 `pnpm build`——它会先构建内部数据库包,再构建主应用;
3. 把 `apps/main/.output` 打包为 `.deploy/.output`;
4. 把 `apps/main/ecosystem.config.cjs` 打包为 `.deploy/ecosystem.config.cjs`;
5. 保留现有 VPS 侧的替换与 PM2 reload 行为。

workflow **不**添加数据库迁移。经过评审的迁移仍是单独的一次运维操作。

## 风险与对策

| 风险 | 对策 |
| --- | --- |
| 迁入 `apps/main` 后 Nuxt 根别名发生变化 | 阶段 1 把所有 Nuxt 根资源一起移动,并验证构建后的站点加上现有路由。 |
| 因为包脚本从 `apps/main` 或 `packages/db` 运行,导致本地环境加载静默失效 | 在需要本地环境值的命令中使用 Node `--env-file-if-exists=../../.env`;CI 和 PM2 仍然注入各自的环境。 |
| Nitro 把 `@grey-flowers/db` 留成 VPS 上不存在的 workspace 符号链接 | 在 Nitro 中内联内部包,并对构建出的 `.output` 针对 Prisma 支撑的路由做冒烟测试。 |
| 抽取过程中 Prisma 所有权被复制(出现两份) | 阶段 1 只保留一个应用持有的 Prisma 目录;阶段 2 用 `git mv` 一次移走,并在**同一提交**里清除 main 包的全部 Prisma 所有权。 |
| 目录移动掩盖了 schema 或迁移改动 | 评审「仅重命名」的 diff,且不运行任何会改 schema 的 Prisma 命令。 |
| `engineStrict` 下 CI 失败 | 阶段 1 把 Actions 的 Node 与声明的 `>=24.18.0 <25.0.0` 范围对齐。 |

## 假设与停止条件

本方案假设:当前 Nuxt 4/Nitro 构建能够内联一个**已编译的 ESM 工作区依赖**(其中含 Prisma 客户端)。如果阶段 2 的「构建产物冒烟测试」证明做不到,那么在任何部署变更之前**先停下**。保留阶段 1 已合并,记录确切的 Nitro 解析失败信息,并根据观察到的构建输出选择一种包输出策略;**不要**用 VPS 上的 `node_modules` 拷贝或第二个 Prisma 客户端来绕过问题。

## 实施边界

本方案影响 8 个以上文件,并移动约 200 个被跟踪的路径。它不需要新的凭据、外部账号访问、数据库改动或远程服务。只有在本文档被明确调用时,实施才可开始。
