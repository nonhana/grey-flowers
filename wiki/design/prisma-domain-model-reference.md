# Grey Flowers Prisma 领域模型参考

> **权威来源**：[`packages/db/prisma/schema.prisma`](../../../packages/db/prisma/schema.prisma)。
>
> 本文只解释当前 Prisma Schema 直接表达的数据模型、约束和关系。Schema 没有规定的字符串格式、业务流程、字段同步方式或权限规则，均不在本文补充推断；这些规则应由应用层另行定义。

## 阅读说明

- 当前 Schema 包含 **14 个模型和 5 组枚举**（含 `Session`、`ActivityMusic` 与 `SessionRevokeReason`）。
- 字段表同时列出数据库标量列与 Prisma 关系字段。关系字段不会额外创建同名数据库列；实际外键列由诸如 `authorId`、`assetId` 的标量字段承载。
- `?` 表示字段可为 `NULL`；`[]` 表示一对多或多对多关系集合。
- `@default(...)` 是创建记录时的默认值，`@updatedAt` 由 Prisma 在更新记录时写入当前时间。
- 删除行为只在 Schema 明确写出 `onDelete` 时标作“显式”。没有写出的外键关系标作“未显式声明”，不将应用层行为当作数据库约束。

## 领域总览

| 领域       | 模型                                                | 责任                                                  |
| ---------- | --------------------------------------------------- | ----------------------------------------------------- |
| 内容发布   | `Article`、`Tag`、`Category`、`ArticleSnapshot`     | 管理文章、文章标签、文章分类与文章版本快照。          |
| 身份与互动 | `User`、`Session`、`Comment`、`UserMessage`         | 管理用户身份、登录会话、评论回复树与面向用户的评论消息。 |
| 动态与音乐 | `Activity`、`Music`、`ActivityMusic`               | 管理动态内容、动态图片排序、音乐元数据与动态-音乐多对多。 |
| 媒体资产   | `Asset`、`ArticleInlineAsset`、`ActivityImageAsset` | 管理受用户创建的图片/音频资产，以及内容与资产的关联。 |

## 内容发布领域

### `Article`（文章）

一篇可发布或未发布的文章。它可属于一个分类、拥有一个可选的资产化封面，并与多个标签建立多对多关系。

| 字段           | 类型                   | 存储与约束                             | 含义                                                                        |
| -------------- | ---------------------- | -------------------------------------- | --------------------------------------------------------------------------- |
| `id`           | `Int`                  | 主键；自增                             | 文章的内部标识。                                                            |
| `to`           | `String`               | 必填；唯一                             | 文章的唯一 `to` 标识。Schema 未限定它是否为 URL、路径或其他格式。           |
| `title`        | `String`               | 必填                                   | 文章标题。Schema 未声明唯一约束。                              |
| `description`  | `String?`              | 可空                                   | 文章说明或摘要文本。                                        |
| `cover`        | `String`               | 必填                                   | 文章封面的字符串引用。Schema 未限定其格式，也未要求与 `coverAssetId` 同步。 |
| `coverAssetId` | `Int?`                 | 可空；外键至 `Asset.id`；有索引        | 封面所使用的资产标识；为空时文章仍可仅使用 `cover` 字符串。                 |
| `alt`          | `String`               | 必填                                   | 名为 `alt` 的文章替代文本字符串值；Schema 未定义其展示或语义用途。Schema 未声明唯一约束。              |
| `publishedAt`  | `DateTime`             | 必填；默认 `now()`                     | 文章的发布时间字段；新建记录默认写入当前时间。                              |
| `editedAt`     | `DateTime`             | 必填；无默认值、无 `@updatedAt`        | 文章编辑时间字段，写入与更新时机需由调用方负责。                            |
| `published`    | `Boolean`              | 必填；默认 `false`                     | 文章是否处于发布状态。                                                      |
| `wordCount`    | `Int`                  | 必填；默认 `0`                         | 文章字数计数值；Schema 不会从 `content` 自动计算。                          |
| `categoryId`   | `Int?`                 | 可空；外键至 `Category.id`             | 所属分类的标识；一篇文章最多关联一个分类。                                  |
| `content`      | `String?`              | 可空；默认空字符串                     | 文章正文文本；新建记录默认为 `""`，但仍允许显式写入 `NULL`。                |
| `category`     | `Category?`            | Prisma 关系字段                        | 通过 `categoryId` 读取的所属分类。                                          |
| `coverAsset`   | `Asset?`               | Prisma 关系字段；删除时显式 `Restrict` | 通过 `coverAssetId` 读取的封面资产。资产被文章引用时不可删除。              |
| `inlineAssets` | `ArticleInlineAsset[]` | Prisma 关系集合                        | 文章正文内使用的资产关联记录。                                              |
| `tags`         | `Tag[]`                | Prisma 隐式多对多关系 `ArticleTags`    | 文章关联的标签集合。                                                        |

**约束与索引**

- 主键：`id`。
- 唯一：`to`。
- 普通索引：`coverAssetId`。
- 条件 GIN 索引：仅当 `published = true` 时，`title` 使用 `gin_trgm_ops` 参与索引，索引名为 `Article_search_title_trgm_idx`。这是面向已发布文章标题的三元组搜索索引。

### `Tag`（标签）

可被多篇文章复用的标签。

| 字段           | 类型        | 存储与约束                          | 含义                                                          |
| -------------- | ----------- | ----------------------------------- | ------------------------------------------------------------- |
| `id`           | `Int`       | 主键；自增                          | 标签的内部标识。                                              |
| `name`         | `String`    | 必填；唯一                          | 标签名称。                                                    |
| `articleCount` | `Int`       | 必填；默认 `0`                      | 标签关联文章的计数缓存；Schema 不会根据 `articles` 自动维护。 |
| `articles`     | `Article[]` | Prisma 隐式多对多关系 `ArticleTags` | 使用该标签的文章集合。                                        |

**约束与索引**：主键为 `id`；`name` 唯一。

### `Category`（分类）

文章的可选归属分类。一个分类可对应多篇文章，并可引用一项封面资产。

| 字段           | 类型        | 存储与约束                             | 含义                                                                        |
| -------------- | ----------- | -------------------------------------- | --------------------------------------------------------------------------- |
| `id`           | `Int`       | 主键；自增                             | 分类的内部标识。                                                            |
| `name`         | `String`    | 必填；唯一                             | 分类名称。                                                                  |
| `cover`        | `String`    | 必填                                   | 分类封面的字符串引用。Schema 未限定其格式，也未要求与 `coverAssetId` 同步。 |
| `coverAssetId` | `Int?`      | 可空；外键至 `Asset.id`；有索引        | 分类封面所用资产的标识。                                                    |
| `articleCount` | `Int`       | 必填；默认 `0`                         | 分类关联文章的计数缓存；Schema 不会从 `articles` 自动计算。                 |
| `articles`     | `Article[]` | Prisma 关系集合                        | 归入该分类的文章集合。                                                      |
| `coverAsset`   | `Asset?`    | Prisma 关系字段；删除时显式 `Restrict` | 通过 `coverAssetId` 读取的封面资产。被分类引用的资产不可删除。              |

**约束与索引**：主键为 `id`；`name` 唯一；`coverAssetId` 有普通索引。

## 身份与互动领域

### `User`（用户）

用户身份、登录凭据字段与其创建内容的关系入口。

| 字段            | 类型            | 存储与约束                             | 含义                                                            |
| --------------- | --------------- | -------------------------------------- | --------------------------------------------------------------- |
| `id`            | `Int`           | 主键；自增                             | 用户的内部标识。                                                |
| `email`         | `String`        | 必填；唯一                             | 用户邮箱。Schema 未定义格式校验或验证状态。                     |
| `site`          | `String?`       | 可空                                   | 用户站点的字符串值；Schema 未限定 URL 格式。                    |
| `avatar`        | `String`        | 必填                                   | 用户头像的字符串引用；Schema 未限定格式。                       |
| `password`      | `String`        | 必填                                   | 用户凭据的字符串值。Schema 未规定散列算法、加密方式或轮换策略。 |
| `username`      | `String`        | 必填；唯一                             | 用户名。                                                        |
| `createdAt`     | `DateTime`      | 必填；默认 `now()`                     | 用户创建时间。                                                  |
| `role`          | `UserRole`      | 必填；默认 `USER`                      | 用户角色代码。允许值见 [用户角色](#用户角色-userrole)。         |
| `updatedAt`     | `DateTime`      | 必填；`@updatedAt`                     | 用户记录最近一次经 Prisma 更新的时间。                          |
| `comments`      | `Comment[]`     | Prisma 关系集合 `Comment.author`       | 该用户发表的评论。                                              |
| `replies`       | `Comment[]`     | Prisma 关系集合 `ReplyToUser`          | 回复目标为该用户的评论集合。                                    |
| `userMessage`   | `UserMessage[]` | Prisma 关系集合 `UserMessage.receiver` | 接收者为该用户的评论消息集合。                                  |
| `createdAssets` | `Asset[]`       | Prisma 关系集合 `AssetCreatedBy`       | 由该用户创建的媒体资产集合。                                    |

**约束与索引**：主键为 `id`；`email` 与 `username` 分别唯一。

### `Comment`（评论）

一条由用户发表的评论，可通过自关联形成父子层级，并可指向被回复的评论和用户。

| 字段               | 类型            | 存储与约束                                            | 含义                                                                                               |
| ------------------ | --------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `id`               | `Int`           | 主键；自增                                            | 评论的内部标识。                                                                                   |
| `content`          | `String`        | 必填                                                  | 评论正文文本。                                                                                     |
| `level`            | `CommentLevel`  | 必填；默认 `PARENT`                                   | 评论层级代码。允许值见 [评论层级](#评论层级-commentlevel)。Schema 不校验它与 `parentId` 是否一致。 |
| `parentId`         | `Int?`          | 可空；自关联外键至 `Comment.id`                       | 父评论的标识；为空表示没有父评论。                                                                 |
| `authorId`         | `Int`           | 必填；外键至 `User.id`                                | 评论作者的用户标识。                                                                               |
| `replyToUserId`    | `Int?`          | 可空；外键至 `User.id`                                | 被回复用户的标识。                                                                                 |
| `publishedAt`      | `DateTime`      | 必填；默认 `now()`                                    | 评论发布时间。                                                                                     |
| `editedAt`         | `DateTime`      | 必填；`@updatedAt`                                    | 评论记录最近一次经 Prisma 更新的时间。                                                             |
| `replyToCommentId` | `Int?`          | 可空；自关联外键至 `Comment.id`                       | 被回复评论的标识。它与 `parentId` 是两条独立关系。                                                 |
| `path`             | `String`        | 必填                                                  | 评论所关联位置的字符串路径；Schema 未限定路径格式或关联对象类型。                                  |
| `contentMarkdown`  | `Json?`         | 可空                                                  | 评论正文的 JSON 表示。Schema 未约束该 JSON 的结构，也未要求与 `content` 同步。                     |
| `author`           | `User`          | Prisma 关系字段                                       | 通过 `authorId` 读取的评论作者。                                                                   |
| `parent`           | `Comment?`      | Prisma 自关联字段 `ParentChild`；删除时显式 `Cascade` | 通过 `parentId` 读取的父评论；删除父评论时级联删除子评论。                                         |
| `children`         | `Comment[]`     | Prisma 自关联集合 `ParentChild`                       | 当前评论的直接子评论集合。                                                                         |
| `replyToComment`   | `Comment?`      | Prisma 自关联字段 `ReplyToComment`                    | 通过 `replyToCommentId` 读取的被回复评论。                                                         |
| `replies`          | `Comment[]`     | Prisma 自关联集合 `ReplyToComment`                    | 以当前评论为回复目标的评论集合。                                                                   |
| `replyToUser`      | `User?`         | Prisma 关系字段 `ReplyToUser`                         | 通过 `replyToUserId` 读取的被回复用户。                                                            |
| `userMessage`      | `UserMessage[]` | Prisma 关系集合                                       | 关联到当前评论的评论消息集合。                                                                     |

**约束与索引**：主键为 `id`。除主键外，Schema 未为本模型声明唯一约束或普通索引。

### `UserMessage`（用户评论消息）

将一条评论指向一个接收用户的关联实体。它不保存消息文本和时间，相关内容来自关联的 `Comment`。

| 字段         | 类型      | 存储与约束                | 含义                               |
| ------------ | --------- | ------------------------- | ---------------------------------- |
| `id`         | `Int`     | 主键；自增                | 用户评论消息的内部标识。           |
| `receiverId` | `Int`     | 必填；外键至 `User.id`    | 接收该消息的用户标识。             |
| `commentId`  | `Int`     | 必填；外键至 `Comment.id` | 该消息关联的评论标识。             |
| `comment`    | `Comment` | Prisma 关系字段；删除时显式 `Cascade` | 通过 `commentId` 读取的关联评论。删除评论时，其消息一并删除。  |
| `receiver`   | `User`    | Prisma 关系字段           | 通过 `receiverId` 读取的接收用户。 |

**约束与索引**：主键为 `id`；`(receiverId, commentId)` 唯一 —— 同一接收者对同一评论至多一条通知。

## 身份与互动领域：会话

### `Session`（登录会话）

每次登录创建的刷新令牌会话。凭据以 HMAC(pepper) 哈希存储，支持轮换与重用检测。

| 字段                        | 类型                 | 存储与约束                                | 含义                                                                 |
| --------------------------- | -------------------- | ----------------------------------------- | -------------------------------------------------------------------- |
| `id`                        | `String`             | 主键；`cuid()` 默认值                      | 会话的内部标识，也是刷新凭据的一部分。                               |
| `userId`                    | `Int`                | 必填；外键至 `User.id`                     | 所属用户标识。                                                       |
| `refreshSecretHash`         | `String`             | 必填                                        | 当前有效刷新 secret 的哈希。                                         |
| `previousRefreshSecretHash` | `String?`            | 可空                                        | 上一次轮换前的刷新 secret 哈希；用于重用检测。                       |
| `createdAt`                 | `DateTime`           | 必填；默认 `now()`                          | 会话创建时间。                                                       |
| `lastUsedAt`                | `DateTime`           | 必填；默认 `now()`                          | 最近一次 refresh 时间（轮换时滑动）。                                |
| `expiresAt`                 | `DateTime`           | 必填                                        | 过期时间（30 天），过期即作废。                                      |
| `revokedAt`                 | `DateTime?`          | 可空                                        | 吊销时间；非空即不可用。                                             |
| `revokeReason`              | `SessionRevokeReason?` | 可空                                      | 吊销原因（登出 / 改密 / 角色变更 / 检测到重用）。                    |
| `user`                      | `User`               | Prisma 关系字段；删除时显式 `Cascade`      | 通过 `userId` 读取的所属用户。删除用户时，其会话一并删除。           |

**约束与索引**：主键为 `id`；`(userId, revokedAt, expiresAt)` 与 `expiresAt` 各有普通索引。每次成功的 `POST /auth/refresh` 都会轮换 `refreshSecretHash`；若是旧 token 再次出现（命中 `previousRefreshSecretHash`），整族会话以 `REUSE_DETECTED` 吊销。

## 动态与音乐领域

### `Activity`（动态）

一条动态内容，可附带字符串图片列表、资产化图片关联和多首音乐。

| 字段              | 类型                   | 存储与约束         | 含义                                                                             |
| ----------------- | ---------------------- | ------------------ | -------------------------------------------------------------------------------- |
| `id`              | `Int`                  | 主键；自增         | 动态的内部标识。                                                                 |
| `content`         | `String`               | 必填；默认空字符串 | 动态正文文本。                                                                   |
| `images`          | `String[]`             | 必填；默认空数组   | 动态图片的字符串列表；Schema 未限定每个值的格式，也未要求与 `imageAssets` 同步。 |
| `publishedAt`     | `DateTime`             | 必填；默认 `now()` | 动态发布时间。                                                                   |
| `editedAt`        | `DateTime`             | 必填；`@updatedAt` | 动态记录最近一次经 Prisma 更新的时间。                                           |
| `contentMarkdown` | `Json?`                | 可空               | 动态正文的 JSON 表示；Schema 未约束结构，也未要求与 `content` 同步。             |
| `imageAssets`     | `ActivityImageAsset[]` | Prisma 关系集合    | 动态关联的资产化图片及其排序记录。                                               |
| `music`           | `ActivityMusic[]` | Prisma 关系集合    | 关联到该动态的音乐多对多记录（经 `ActivityMusic`，展示按 `music.id` 升序）。    |

**约束与索引**：主键为 `id`。除主键外，Schema 未为本模型声明唯一约束或普通索引。

### `Music`（音乐）

一条音乐元数据记录，可被多条动态通过 `ActivityMusic` 多对多关联引用，并可分别引用音源资产和封面资产。

| 字段            | 类型        | 存储与约束                                                | 含义                                                                      |
| --------------- | ----------- | --------------------------------------------------------- | ------------------------------------------------------------------------- |
| `id`            | `Int`       | 主键；自增                                                | 音乐记录的内部标识。                                                      |
| `title`         | `String`    | 必填                                                      | 曲目标题。                                                                |
| `src`           | `String`    | 必填                                                      | 音源的字符串引用。Schema 未限定格式，也未要求与 `sourceAssetId` 同步。    |
| `sourceAssetId` | `Int?`      | 可空；外键至 `Asset.id`；有索引                           | 音源所用资产的标识。                                                      |
| `seconds`       | `Int`       | 必填                                                      | 曲目时长的整数秒数。Schema 未声明非负约束。                               |
| `album`         | `String`    | 必填                                                      | 专辑名称。                                                                |
| `artist`        | `String`    | 必填                                                      | 表演者或作者名称。                                                        |
| `cover`         | `String`    | 必填                                                      | 音乐封面的字符串引用。Schema 未限定格式，也未要求与 `coverAssetId` 同步。 |
| `coverAssetId`  | `Int?`      | 可空；外键至 `Asset.id`；有索引                           | 音乐封面所用资产的标识。                                                  |
| `createdAt`     | `DateTime`  | 必填；默认 `now()`                                        | 入库时间，供库内排序与展示用。                                            |
| `activities`    | `ActivityMusic[]` | Prisma 关系集合                     | 引用该音乐的动态关联记录（多对多）。                                      |
| `sourceAsset`   | `Asset?`    | Prisma 关系字段 `MusicSourceAsset`；删除时显式 `Restrict` | 通过 `sourceAssetId` 读取的音源资产。被引用资产不可删除。                 |
| `coverAsset`    | `Asset?`    | Prisma 关系字段 `MusicCoverAsset`；删除时显式 `Restrict`  | 通过 `coverAssetId` 读取的封面资产。被引用资产不可删除。                  |

**约束与索引**：主键为 `id`；`sourceAssetId`、`coverAssetId` 各有普通索引。音乐与动态的关联不再通过 `Music.activityId` 外键表达，而是显式多对多 `ActivityMusic`（见下）。

### `ActivityMusic`（动态-音乐多对多）

连接动态与音乐的显式多对多关联。

| 字段        | 类型        | 存储与约束                            | 含义                                        |
| ----------- | ----------- | ------------------------------------- | ------------------------------------------- |
| `activityId` | `Int`       | 复合主键组成部分；外键至 `Activity.id` | 关联该音乐记录是否显示在动态中…（动态标识）。 |
| `musicId`    | `Int`       | 复合主键组成部分；外键至 `Music.id`；有索引 | 关联的音乐标识。                        |
| `activity`   | `Activity`  | Prisma 关系字段；删除时显式 `Cascade`  | 通过 `activityId` 读取的动态。删除动态时，其关联记录一并删除。 |
| `music`      | `Music`     | Prisma 关系字段；删除时显式 `Cascade`  | 通过 `musicId` 读取的音乐。删除音乐时，其关联记录一并删除。 |

**约束与索引**：复合主键为 `(activityId, musicId)`，因此同一动态至多关联同一音乐一次；`musicId` 有普通索引。

## 媒体资产领域

### `Asset`（媒体资产）

图片或音频资产的统一记录。资产由一个用户创建，并可被文章、分类、音乐和动态图片关联使用。

| 字段                  | 类型                   | 存储与约束                                              | 含义                                                                      |
| --------------------- | ---------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------- |
| `id`                  | `Int`                  | 主键；自增                                              | 资产的内部标识。                                                          |
| `storageKey`          | `String`               | 必填；唯一                                              | 资产在存储系统中的唯一键。Schema 未限定键的命名规则或存储提供方。         |
| `mediaType`           | `AssetMediaType`       | 必填                                                    | 资产媒体类型。允许值见 [资产媒体类型](#资产媒体类型-assetmediatype)。     |
| `mimeType`            | `String`               | 必填                                                    | 资产的 MIME 类型字符串；Schema 未校验其是否与 `mediaType` 一致。          |
| `byteSize`            | `BigInt`               | 必填                                                    | 资产文件大小的字节数。                                                    |
| `width`               | `Int?`                 | 可空                                                    | 媒体宽度。Schema 未限定单位或要求何种媒体必须填写。                       |
| `height`              | `Int?`                 | 可空                                                    | 媒体高度。Schema 未限定单位或要求何种媒体必须填写。                       |
| `durationMs`          | `Int?`                 | 可空                                                    | 媒体时长的毫秒数。Schema 未声明非负约束，也未限定何种媒体必须填写。       |
| `status`              | `AssetStatus`          | 必填；默认 `AVAILABLE`；有索引                          | 资产状态代码。允许值见 [资产状态](#资产状态-assetstatus)。                |
| `createdById`         | `Int`                  | 必填；外键至 `User.id`；有索引                          | 创建该资产的用户标识。                                                    |
| `createdAt`           | `DateTime`             | 必填；默认 `now()`                                      | 资产创建时间。                                                            |
| `updatedAt`           | `DateTime`             | 必填；`@updatedAt`                                      | 资产记录最近一次经 Prisma 更新的时间。                                    |
| `deletedAt`           | `DateTime?`            | 可空                                                    | 资产删除时间字段，可用于记录软删除时间；Schema 不要求它与 `status` 同步。 |
| `createdBy`           | `User`                 | Prisma 关系字段 `AssetCreatedBy`；删除时显式 `Restrict` | 通过 `createdById` 读取的创建用户。用户仍被资产引用时不可删除。           |
| `articleCovers`       | `Article[]`            | Prisma 关系集合 `ArticleCoverAsset`                     | 将该资产作为封面的文章集合。                                              |
| `categoryCovers`      | `Category[]`           | Prisma 关系集合 `CategoryCoverAsset`                    | 将该资产作为封面的分类集合。                                              |
| `musicSources`        | `Music[]`              | Prisma 关系集合 `MusicSourceAsset`                      | 将该资产作为音源的音乐集合。                                              |
| `musicCovers`         | `Music[]`              | Prisma 关系集合 `MusicCoverAsset`                       | 将该资产作为封面的音乐集合。                                              |
| `activityImages`      | `ActivityImageAsset[]` | Prisma 关系集合                                         | 使用该资产的动态图片关联记录。                                            |
| `articleInlineAssets` | `ArticleInlineAsset[]` | Prisma 关系集合                                         | 使用该资产的文章内联资产关联记录。                                        |

**约束与索引**：主键为 `id`；`storageKey` 唯一；`status` 与 `createdById` 各有普通索引。

### `ArticleInlineAsset`（文章内联资产关联）

连接文章和资产的显式多对多关联模型，用于表示文章正文内使用的资产。

| 字段        | 类型      | 存储与约束                                  | 含义                                                          |
| ----------- | --------- | ------------------------------------------- | ------------------------------------------------------------- |
| `articleId` | `Int`     | 复合主键组成部分；外键至 `Article.id`       | 使用该资产的文章标识。                                        |
| `assetId`   | `Int`     | 复合主键组成部分；外键至 `Asset.id`；有索引 | 被文章内联使用的资产标识。                                    |
| `article`   | `Article` | Prisma 关系字段；删除时显式 `Cascade`       | 通过 `articleId` 读取的文章。删除文章时，其关联记录一并删除。 |
| `asset`     | `Asset`   | Prisma 关系字段；删除时显式 `Restrict`      | 通过 `assetId` 读取的资产。资产仍被关联时不可删除。           |

**约束与索引**：复合主键为 `(articleId, assetId)`，因此同一资产最多在同一文章中关联一次；`assetId` 有普通索引。

### `ActivityImageAsset`（动态图片资产关联）

连接动态和图片资产的显式多对多关联模型，并保存图片在该动态内的排序位置。

| 字段         | 类型       | 存储与约束                                  | 含义                                                                |
| ------------ | ---------- | ------------------------------------------- | ------------------------------------------------------------------- |
| `activityId` | `Int`      | 复合主键组成部分；外键至 `Activity.id`      | 使用该图片资产的动态标识。                                          |
| `assetId`    | `Int`      | 复合主键组成部分；外键至 `Asset.id`；有索引 | 被动态使用的资产标识。                                              |
| `position`   | `Int`      | 必填；与 `activityId` 联合唯一              | 图片在同一动态内的排序位置。Schema 未声明起始值、连续性或非负约束。 |
| `activity`   | `Activity` | Prisma 关系字段；删除时显式 `Cascade`       | 通过 `activityId` 读取的动态。删除动态时，其关联记录一并删除。      |
| `asset`      | `Asset`    | Prisma 关系字段；删除时显式 `Restrict`      | 通过 `assetId` 读取的资产。资产仍被关联时不可删除。                 |

**约束与索引**：复合主键为 `(activityId, assetId)`；`(activityId, position)` 唯一，因此同一动态中一个排序位置至多对应一个资产；`assetId` 有普通索引。

## 枚举定义

### 评论层级 `CommentLevel`

| 值       | 使用字段        | 含义                               |
| -------- | --------------- | ---------------------------------- |
| `PARENT` | `Comment.level` | 父级评论层级代码，也是字段默认值。 |
| `CHILD`  | `Comment.level` | 子级评论层级代码。                 |

`Comment.level` 与 `parentId` 的组合规则未由 Schema 强制，例如 Schema 本身不阻止 `CHILD` 值的记录缺少 `parentId`。

### 用户角色 `UserRole`

| 值      | 使用字段    | 含义                               |
| ------- | ----------- | ---------------------------------- |
| `USER`  | `User.role` | 普通用户角色代码，也是字段默认值。 |
| `ADMIN` | `User.role` | 管理员角色代码。                   |

枚举只定义角色取值，不定义各角色拥有的权限。

### 会话吊销原因 `SessionRevokeReason`

| 值                | 使用字段            | 含义                                  |
| ----------------- | ------------------- | ------------------------------------- |
| `LOGOUT`          | `Session.revokeReason` | 用户主动登出。                    |
| `PASSWORD_CHANGED`| `Session.revokeReason` | 修改密码后吊销全部会话。          |
| `ROLE_CHANGED`    | `Session.revokeReason` | 角色变更后吊销全部会话。          |
| `REUSE_DETECTED`  | `Session.revokeReason` | 检测到刷新令牌重用（可能被盗）。 |

### 资产媒体类型 `AssetMediaType`

| 值      | 使用字段          | 含义               |
| ------- | ----------------- | ------------------ |
| `IMAGE` | `Asset.mediaType` | 图片资产类型代码。 |
| `AUDIO` | `Asset.mediaType` | 音频资产类型代码。 |

### 资产状态 `AssetStatus`

| 值                | 使用字段       | 含义                           |
| ----------------- | -------------- | ------------------------------ |
| `AVAILABLE`       | `Asset.status` | 可用资产状态，也是字段默认值。 |
| `PENDING_CLEANUP` | `Asset.status` | 等待清理的资产状态。           |
| `DELETED`         | `Asset.status` | 已删除的资产状态。             |

状态枚举不定义状态迁移顺序，也不要求 `DELETED` 与 `deletedAt` 成对出现。

## 关系与删除策略总览

| 从模型               | 到模型                | 基数与外键                                            | Schema 中的删除策略                                     |
| -------------------- | --------------------- | ----------------------------------------------------- | ------------------------------------------------------- |
| `Article`            | `Category`            | 多篇文章对零或一个分类，`Article.categoryId` 可空     | 未显式声明。                                            |
| `Article`            | `Asset`（封面）       | 多篇文章对零或一个资产，`Article.coverAssetId` 可空   | 显式 `Restrict`。                                       |
| `Article`            | `Tag`                 | 多对多，隐式关系名为 `ArticleTags`                    | 未在 Schema 中单列 `onDelete`。                         |
| `User`               | `Comment`（作者）     | 一个用户对多条评论，`Comment.authorId` 必填           | 未显式声明。                                            |
| `Comment`            | `Comment`（父子）     | 一条评论对零或一个父评论，`parentId` 可空             | 显式 `Cascade`：删除父评论会删除其子评论。              |
| `Comment`            | `Comment`（回复目标） | 一条评论对零或一个被回复评论，`replyToCommentId` 可空 | 未显式声明。                                            |
| `Comment`            | `User`（回复目标）    | 多条评论对零或一个用户，`replyToUserId` 可空          | 未显式声明。                                            |
| `UserMessage`        | `User`                | 多条消息对一个接收用户，`receiverId` 必填             | 未显式声明。                                            |
| `UserMessage`        | `Comment`             | 多条消息对一条评论，`commentId` 必填                  | 显式 `Cascade`：删除评论会删除相关评论消息。            |
| `Activity`           | `Music`               | 多条动态对多条音乐，显式多对多 `ActivityMusic`        | 删除任一侧时 `Cascade`。                                |
| `User`               | `Asset`（创建者）     | 一个用户对多项资产，`Asset.createdById` 必填          | 显式 `Restrict`。                                       |
| `Music`              | `Asset`（音源/封面）  | 多条音乐各自可选引用一个资产                          | 两条关系均显式 `Restrict`。                             |
| `ArticleInlineAsset` | `Article` / `Asset`   | 文章与资产的显式多对多                                | 删除文章时 `Cascade`；删除仍被关联的资产时 `Restrict`。 |
| `ActivityImageAsset` | `Activity` / `Asset`  | 动态与资产的显式多对多，附带 `position`               | 删除动态时 `Cascade`；删除仍被关联的资产时 `Restrict`。 |

## Schema 已表达的完整性边界

下列事项与领域含义密切相关，但当前 Schema **没有**将它们表达成数据库约束：

- `Article.cover`、`Category.cover`、`Music.src`、`Music.cover` 等字符串引用，不要求与相应的 `Asset` 外键一致。
- `Tag.articleCount`、`Category.articleCount`、`Article.wordCount` 都是持久化计数字段，不会由关联数据或正文自动计算。
- `Activity.images` 与 `ActivityImageAsset` 是并行的图片表示，Schema 不保证二者内容或顺序一致。
- `content` 与 `contentMarkdown` 是并行的文本/JSON 表示，Schema 不保证二者可互相还原或同步。
- `Asset.status`、`Asset.deletedAt`、资产实际存储对象之间没有 Schema 级的一致性规则。
- 多数字符串字段没有长度、格式、URL、路径或 MIME 语法约束；整数时长、尺寸和排序位置也没有范围约束。
- `Comment` 的层级代码、父评论、被回复评论和被回复用户相互独立；除父评论删除级联外，Schema 不规定它们如何组合。

这些边界意味着：需要跨字段一致性、格式校验、计数维护、权限判断或状态迁移时，应由应用层在写入路径中明确实现，并在需要强约束时另行演进 Schema。
