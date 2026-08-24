/* oxlint-disable no-use-before-define */
import bcrypt from 'bcryptjs';
import { createHash, randomUUID } from 'node:crypto';

import type { Prisma } from '../src/index.ts';

import { createPrismaClient } from '../src/index.ts';
import { isLocalDatabaseUrl } from './guard-local-db.mts';

const PASSWORD_COST = 10;

/** 数量配置：足够撑起分页（每页 20，>10 页）与模糊检索命中。 */
const COUNTS = {
  categories: 24,
  tags: 160,
  users: 320,
  // 资产按 purpose 目录分桶（storageKey 前缀稳定推导 purpose）
  assetsCategoryCover: 24,
  assetsArticleCover: 60,
  assetsArticleInline: 520,
  assetsActivityImage: 320,
  assetsMusicCover: 260,
  assetsMusicSource: 280,
  articlesPublished: 640,
  articlesDraft: 160,
  music: 260,
  activities: 180,
  commentsParent: 1400,
  commentsChild: 700,
} as const;

const run = async () => {
  const url = process.env.HANA_DATABASE_URL;
  if (!url) {
    throw new Error('缺少 HANA_DATABASE_URL 环境变量（从根 .env 读取）。');
  }
  if (!isLocalDatabaseUrl(url)) {
    throw new Error(
      `拒绝在非本机测试库执行 seed（目标: ${new URL(url).host}）。种子会清空全部表，仅允许 localhost/127.0.0.1。`,
    );
  }
  const prisma = createPrismaClient(url);

  try {
    const adminPasswordHash = await bcrypt.hash('20021209xiang', PASSWORD_COST);
    // 所有非管理员用户复用同一个哈希（假造数据，无需每人生成）。
    const userPasswordHash = await bcrypt.hash('seed-password', PASSWORD_COST);

    await prisma.$transaction(async (tx) => {
      // ---------- 清空（外键逆序；保证幂等，可反复执行） ----------
      await tx.userMessage.deleteMany();
      await tx.comment.deleteMany();
      await tx.session.deleteMany();
      await tx.activityMusic.deleteMany();
      await tx.activityImageAsset.deleteMany();
      await tx.articleInlineAsset.deleteMany();
      await tx.articleSnapshot.deleteMany();
      await tx.music.deleteMany();
      await tx.activity.deleteMany();
      await tx.article.deleteMany();
      await tx.tag.deleteMany();
      await tx.category.deleteMany();
      await tx.asset.deleteMany();
      await tx.user.deleteMany();

      // ---------- User（320：1 Admin + 319 普通） ----------
      const userRows: Array<{
        email: string;
        username: string;
        password: string;
        avatar: string;
        role: 'ADMIN' | 'USER';
        site: string | null;
        createdAt: Date;
      }> = [];

      userRows.push({
        email: 'nonhana@outlook.com',
        username: 'nonhana',
        password: adminPasswordHash,
        avatar: avatarUrl('nonhana@outlook.com'),
        role: 'ADMIN',
        site: 'https://blog.example.com',
        createdAt: new Date('2024-01-01T00:00:00Z'),
      });

      for (let i = 0; i < COUNTS.users - 1; i += 1) {
        const n = i + 1;
        const email = `user${n}@example.com`;
        // 约每 13 名用户取 1 名落在近 30 天窗口（13 与 30 互质 → 逐日错开，
        // 避免只落在少数几天；也让趋势图/joined30d 有数），其余保留历史分布。
        const createdAt = i % 13 === 0 ? recentDate(i) : spreadDate(i, 1800);
        userRows.push({
          email,
          username: `user${n}`,
          password: userPasswordHash,
          avatar: avatarUrl(email),
          role: 'USER',
          // 部分用户带站点、部分不带，覆盖用户运营列表。
          site: i % 3 === 0 ? `https://u${i % 100}.example.com` : null,
          createdAt,
        });
      }

      const users = await tx.user.createMany({ data: userRows });
      const userIds = (
        await tx.user.findMany({
          select: { id: true },
          orderBy: { id: 'asc' },
        })
      ).map((row) => row.id);
      // userIds[0] 为管理员。普通用户区段。
      const adminId = userIds[0];
      const regularUserIds = userIds.slice(1);

      // ---------- Asset（大量，按 purpose 分桶，id 连续） ----------
      const assetRecords: Array<{
        storageKey: string;
        mediaType: 'IMAGE' | 'AUDIO';
        mimeType: string;
        byteSize: bigint;
        width: number | null;
        height: number | null;
        durationMs: number | null;
        status: 'AVAILABLE' | 'PENDING_CLEANUP' | 'DELETED';
        createdById: number;
        createdAt: Date;
        deletedAt: Date | null;
      }> = [];

      // category-covers：IMAGE
      for (let i = 0; i < COUNTS.assetsCategoryCover; i += 1) {
        assetRecords.push(
          imageAsset(
            'category-covers',
            i % regularUserIds.length,
            regularUserIds,
            i,
          ),
        );
      }
      // article-covers：IMAGE
      for (let i = 0; i < COUNTS.assetsArticleCover; i += 1) {
        const status = i % 50 === 0 ? 'PENDING_CLEANUP' : 'AVAILABLE';
        assetRecords.push(
          imageAsset(
            'article-covers',
            i % regularUserIds.length,
            regularUserIds,
            i,
            status,
          ),
        );
      }
      // article-inline：IMAGE（含一部分 DELETED 覆盖状态筛选）
      for (let i = 0; i < COUNTS.assetsArticleInline; i += 1) {
        const status =
          i % 60 === 0
            ? 'DELETED'
            : i % 30 === 0
              ? 'PENDING_CLEANUP'
              : 'AVAILABLE';
        assetRecords.push(
          imageAsset(
            'article-inline',
            i % regularUserIds.length,
            regularUserIds,
            i,
            status,
          ),
        );
      }
      // activity-images：IMAGE
      for (let i = 0; i < COUNTS.assetsActivityImage; i += 1) {
        assetRecords.push(
          imageAsset(
            'activity-images',
            i % regularUserIds.length,
            regularUserIds,
            i,
          ),
        );
      }
      // music-covers：IMAGE
      for (let i = 0; i < COUNTS.assetsMusicCover; i += 1) {
        assetRecords.push(
          imageAsset(
            'music-covers',
            i % regularUserIds.length,
            regularUserIds,
            i,
          ),
        );
      }
      // music-sources：AUDIO
      for (let i = 0; i < COUNTS.assetsMusicSource; i += 1) {
        assetRecords.push(
          audioAsset(
            'music-sources',
            i % regularUserIds.length,
            regularUserIds,
            i,
          ),
        );
      }
      // 每个 bucket 末尾追加若干「无引用」资产，供删除场景（非 409）验证。
      for (let i = 0; i < 8; i += 1) {
        assetRecords.push(
          imageAsset(
            'article-inline',
            i % regularUserIds.length,
            regularUserIds,
            9000 + i,
            'AVAILABLE',
          ),
        );
        assetRecords.push(
          imageAsset(
            'article-covers',
            i % regularUserIds.length,
            regularUserIds,
            9100 + i,
            'AVAILABLE',
          ),
        );
      }

      await tx.asset.createMany({ data: assetRecords });
      const assetIds = (
        await tx.asset.findMany({
          select: { id: true },
          orderBy: { id: 'asc' },
        })
      ).map((row) => row.id);
      // 按创建顺序切出各 purpose 区段 id。
      const slice = (from: number, length: number) =>
        assetIds.slice(from, from + length);
      const categoryCoverIds = slice(0, COUNTS.assetsCategoryCover);
      const articleCoverIds = slice(
        COUNTS.assetsCategoryCover,
        COUNTS.assetsArticleCover,
      );
      const articleInlineIds = slice(
        COUNTS.assetsCategoryCover + COUNTS.assetsArticleCover,
        COUNTS.assetsArticleInline,
      );
      const activityImageIds = slice(
        COUNTS.assetsCategoryCover +
          COUNTS.assetsArticleCover +
          COUNTS.assetsArticleInline,
        COUNTS.assetsActivityImage,
      );
      const musicCoverIds = slice(
        COUNTS.assetsCategoryCover +
          COUNTS.assetsArticleCover +
          COUNTS.assetsArticleInline +
          COUNTS.assetsActivityImage,
        COUNTS.assetsMusicCover,
      );
      const musicSourceIds = slice(
        COUNTS.assetsCategoryCover +
          COUNTS.assetsArticleCover +
          COUNTS.assetsArticleInline +
          COUNTS.assetsActivityImage +
          COUNTS.assetsMusicCover,
        COUNTS.assetsMusicSource,
      );
      const inlineExtraIds = slice(
        COUNTS.assetsCategoryCover +
          COUNTS.assetsArticleCover +
          COUNTS.assetsArticleInline +
          COUNTS.assetsActivityImage +
          COUNTS.assetsMusicCover +
          COUNTS.assetsMusicSource,
        8,
      );

      // ---------- Category ----------
      const categoryRows = CATEGORY_NAMES.map((name, i) => ({
        name,
        cover: coverUrl(categoryCoverIds[i % categoryCoverIds.length]),
        coverAssetId: categoryCoverIds[i % categoryCoverIds.length],
      }));
      await tx.category.createMany({ data: categoryRows });
      const categoryIds = (
        await tx.category.findMany({
          select: { id: true },
          orderBy: { id: 'asc' },
        })
      ).map((row) => row.id);
      // ---------- Tag ----------
      const tagRows = Array.from({ length: COUNTS.tags }, (_, i) => ({
        name: `tag-${i}`,
      }));
      await tx.tag.createMany({ data: tagRows });
      const tagIds = (
        await tx.tag.findMany({
          select: { id: true },
          orderBy: { id: 'asc' },
        })
      ).map((row) => row.id);

      // ---------- Article（published + draft） ----------
      const articleRows: Array<{
        to: string;
        title: string;
        description: string;
        cover: string;
        coverAssetId: number | null;
        alt: string;
        publishedAt: Date;
        editedAt: Date;
        published: boolean;
        wordCount: number;
        revision: number;
        categoryId: number | null;
        content: string;
      }> = [];

      const totalArticles = COUNTS.articlesPublished + COUNTS.articlesDraft;
      const categoryPicks = longTailPicks(categoryIds.length, 64);
      for (let i = 0; i < totalArticles; i += 1) {
        const published = i < COUNTS.articlesPublished;
        const categoryIndex = categoryPicks[i % categoryPicks.length];
        const category = CATEGORY_NAMES[categoryIndex];
        const coverAssetId = articleCoverIds[i % articleCoverIds.length];
        const publishedAt = published
          ? i % 7 === 0
            ? recentDate(i)
            : spreadDate(i, 365 * 6)
          : futureDate(i);
        articleRows.push({
          to: `/articles/article-${i}`,
          title: articleTitle(i),
          description: `关于「${articleTitle(i)}」的说明摘要：${SUMMARY[i % SUMMARY.length]}。`,
          cover: coverUrl(coverAssetId),
          coverAssetId,
          alt: `${category}-封面图 ${i}`,
          publishedAt,
          // 已发布文章 editedAt 与 publishedAt 一致（原含义）；草稿保留过去编辑日期。
          editedAt: published ? publishedAt : spreadDate(i, 365 * 6),
          published,
          wordCount: WORD_COUNT_BASE + (i % 2000),
          revision: 1 + (i % 3),
          categoryId: categoryIds[categoryIndex],
          content: articleBody(i),
        });
      }
      await tx.article.createMany({ data: articleRows });
      const articleIds = (
        await tx.article.findMany({
          select: { id: true },
          orderBy: { id: 'asc' },
        })
      ).map((row) => row.id);

      // ---------- Article→Tag 多对多（隐式联接表，批量 raw 插入） ----------
      // 长尾抽样下同一篇的两个 k 可能撞上同一个标签，先去重再分块：
      // 联接表主键挡得住，但重复行会让「每篇 2..5 个标签」这句话不成立。
      const articleTagPairs = new Set<string>();
      const tagPicks = longTailPicks(tagIds.length, 48);
      articleIds.forEach((articleId, i) => {
        const tagCount = 2 + (i % 4); // 2..5 个标签
        for (let k = 0; k < tagCount; k += 1) {
          const tagIndex = tagPicks[(i * 7 + k * 13) % tagPicks.length];
          articleTagPairs.add(`${articleId},${tagIds[tagIndex]}`);
        }
      });
      const articleTagRows = [...articleTagPairs];
      const tagChunks: string[] = [];
      for (let offset = 0; offset < articleTagRows.length; offset += 2000) {
        const chunk = articleTagRows.slice(offset, offset + 2000);
        tagChunks.push(
          `INSERT INTO "_ArticleTags" ("A","B") VALUES (${chunk.join('),(')}) ON CONFLICT DO NOTHING`,
        );
      }
      await Promise.all(
        tagChunks.map((statement) => tx.$executeRawUnsafe(statement)),
      );

      // ---------- Category / Tag 的 articleCount 物化列 ----------
      // 这一列由 taxonomy 事务按 count(articles) 维护，口径是「全部文章（含草稿）」。
      // 造数走的是 createMany + raw insert，绕过了那条路径，不回填的话整库全是 0：
      // 分类页每行都写「0 篇文章」、删除守卫失效、概览的内容构成排行是一排空条。
      await tx.$executeRawUnsafe(`
        UPDATE "Category" AS c
        SET "articleCount" = COALESCE(a.n, 0)
        FROM (SELECT "categoryId" AS id, COUNT(*) AS n FROM "Article"
              WHERE "categoryId" IS NOT NULL GROUP BY "categoryId") AS a
        WHERE c.id = a.id
      `);
      await tx.$executeRawUnsafe(`
        UPDATE "Tag" AS t
        SET "articleCount" = COALESCE(a.n, 0)
        FROM (SELECT "B" AS id, COUNT(*) AS n FROM "_ArticleTags" GROUP BY "B") AS a
        WHERE t.id = a.id
      `);

      // ---------- ArticleSnapshot（每篇文章按 revision 生成快照） ----------
      const snapshotRows: Array<{
        articleId: number;
        revision: number;
        title: string;
        description: string | null;
        content: string;
        wordCount: number;
        createdById: number;
        createdAt: Date;
      }> = [];
      articleIds.forEach((articleId, i) => {
        const revisionCount = 1 + (i % 3);
        for (let rev = 1; rev <= revisionCount; rev += 1) {
          snapshotRows.push({
            articleId,
            revision: rev,
            title: articleTitle(i),
            description: `第 ${rev} 版快照`,
            content: articleBody(i, rev),
            wordCount: WORD_COUNT_BASE + ((i + rev) % 1600),
            createdById: regularUserIds[i % regularUserIds.length],
            createdAt: spreadDate(i, 365 * 6),
          });
        }
      });
      await tx.articleSnapshot.createMany({ data: snapshotRows });

      // ---------- ArticleInlineAsset ----------
      const inlineRows: Array<{ articleId: number; assetId: number }> = [];
      inlineExtraIds.concat(articleInlineIds).forEach((assetId, i) => {
        inlineRows.push({
          articleId: articleIds[i % articleIds.length],
          assetId,
        });
      });
      await tx.articleInlineAsset.createMany({
        data: inlineRows,
        skipDuplicates: true,
      });

      // ---------- Music ----------
      const musicRows = Array.from({ length: COUNTS.music }, (_, i) => ({
        title: MUSIC_TITLES[i % MUSIC_TITLES.length],
        src: `https://cdn.example.com/music/${randomUUID()}.mp3`,
        sourceAssetId: musicSourceIds[i % musicSourceIds.length],
        seconds: 90 + (i % 480),
        // 缺元数据样本：每 20 条取 1 条 artist 或 album 留空，
        // 让 admin「缺元数据」筛选与 overview missingMetadata 指标在种子上有真实数据。
        album: i % 20 === 0 ? '' : MUSIC_ALBUMS[i % MUSIC_ALBUMS.length],
        artist: i % 20 === 10 ? '' : MUSIC_ARTISTS[i % MUSIC_ARTISTS.length],
        cover: musicCover(musicCoverIds[i % musicCoverIds.length]),
        coverAssetId:
          i % 5 === 0 ? null : musicCoverIds[i % musicCoverIds.length],
        createdAt: spreadDate(i, 800),
      }));
      await tx.music.createMany({ data: musicRows });
      const musicIds = (
        await tx.music.findMany({
          select: { id: true },
          orderBy: { id: 'asc' },
        })
      ).map((row) => row.id);

      // ---------- Activity ----------
      const activityRows = Array.from(
        { length: COUNTS.activities },
        (_, i) => ({
          content: activityBody(i),
          images: Array.from({ length: 1 + (i % 3) }, (_, k) =>
            coverUrl(activityImageIds[(i * 3 + k) % activityImageIds.length]),
          ),
          // 约每 4 条动态取 1 条落在近 30 天窗口（趋势图/动态 last30d 可见）。
          publishedAt: i % 7 === 0 ? recentDate(i) : spreadDate(i, 900),
          contentMarkdown: { type: 'root', children: [] },
        }),
      );
      await tx.activity.createMany({ data: activityRows });
      const activityIds = (
        await tx.activity.findMany({
          select: { id: true },
          orderBy: { id: 'asc' },
        })
      ).map((row) => row.id);

      // ---------- ActivityMusic ----------
      const activityMusicRows: Array<{ activityId: number; musicId: number }> =
        [];
      activityIds.forEach((activityId, i) => {
        const trackCount = 1 + (i % 3);
        for (let k = 0; k < trackCount; k += 1) {
          activityMusicRows.push({
            activityId,
            musicId: musicIds[(i * 3 + k) % musicIds.length],
          });
        }
      });
      await tx.activityMusic.createMany({
        data: activityMusicRows,
        skipDuplicates: true,
      });

      // ---------- ActivityImageAsset（position 有序） ----------
      const activityImageRows: Array<{
        activityId: number;
        assetId: number;
        position: number;
      }> = [];
      activityIds.forEach((activityId, i) => {
        const imageCount = 1 + (i % 4);
        for (let position = 0; position < imageCount; position += 1) {
          activityImageRows.push({
            activityId,
            assetId:
              activityImageIds[(i * 4 + position) % activityImageIds.length],
            position,
          });
        }
      });
      await tx.activityImageAsset.createMany({ data: activityImageRows });

      // ---------- Comment（PARENT 树 + CHILD 回复） ----------
      const parentRows: Array<{
        content: string;
        level: 'PARENT' | 'CHILD';
        parentId: number | null;
        authorId: number;
        replyToUserId: number | null;
        replyToCommentId: number | null;
        publishedAt: Date;
        path: string;
        contentMarkdown: Prisma.InputJsonValue;
      }> = [];
      const parentIds: number[] = [];

      for (let i = 0; i < COUNTS.commentsParent; i += 1) {
        const articleId = articleIds[i % articleIds.length];
        const authorId = regularUserIds[i % regularUserIds.length];
        parentRows.push({
          content: commentBody(PARENT_COMMENT_OPENERS, i),
          level: 'PARENT',
          parentId: null,
          authorId,
          replyToUserId: null,
          replyToCommentId: null,
          // 主站文章路由为 /articles/[article]；to 需为规范路由 /articles/article-<id>（API 按 to 精确匹配 path）。
          publishedAt: i % 11 === 0 ? recentDate(i) : spreadDate(i, 365 * 4),
          path: `/articles/article-${articleId - 1}`,
          contentMarkdown: { type: 'root', children: [] },
        });
      }
      await tx.comment.createMany({ data: parentRows });
      (
        await tx.comment.findMany({
          select: { id: true },
          orderBy: { id: 'asc' },
        })
      ).forEach((row) => parentIds.push(row.id));

      const childRows: Array<{
        content: string;
        level: 'PARENT' | 'CHILD';
        parentId: number;
        authorId: number;
        replyToUserId: number | null;
        replyToCommentId: number | null;
        publishedAt: Date;
        path: string;
        contentMarkdown: Prisma.InputJsonValue;
      }> = [];
      for (let i = 0; i < COUNTS.commentsChild; i += 1) {
        const parentId = parentIds[i % parentIds.length];
        const articleIndex = (i * 5) % totalArticles;
        const authorId = regularUserIds[(i * 5 + 1) % regularUserIds.length];
        const replyToUserId =
          regularUserIds[(i * 7 + 2) % regularUserIds.length];
        const replyToCommentId = parentId;
        childRows.push({
          content: commentBody(CHILD_COMMENT_OPENERS, i),
          level: 'CHILD',
          parentId,
          authorId,
          replyToUserId:
            authorId === replyToUserId
              ? regularUserIds[(i * 3 + 4) % regularUserIds.length]
              : replyToUserId,
          replyToCommentId,
          // 与父评论同一节奏掺入近 30 天窗口（子评论紧随父评论之后）。
          publishedAt: new Date(
            (i % 11 === 0 ? recentDate(i) : spreadDate(i, 365 * 4)).getTime() +
              3600_000 +
              (i % 3600_000),
          ),
          path: `/articles/article-${articleIndex}`,
          contentMarkdown: { type: 'root', children: [] },
        });
      }
      await tx.comment.createMany({ data: childRows });
      // 取回全部评论 id（等长插入，顺序一致）。
      const allCommentIds = (
        await tx.comment.findMany({
          select: { id: true },
          orderBy: { id: 'asc' },
        })
      ).map((row) => row.id);
      const childCommentIds = allCommentIds.slice(COUNTS.commentsParent);

      // ---------- UserMessage（子回复 → 接收者通知） ----------
      const messageRows: Array<{ receiverId: number; commentId: number }> = [];
      childCommentIds.forEach((commentId, i) => {
        const receiverId = regularUserIds[(i * 7 + 2) % regularUserIds.length];
        messageRows.push({ receiverId, commentId });
      });
      await tx.userMessage.createMany({
        data: messageRows,
        skipDuplicates: true,
      });

      // ---------- Session（每个用户 1-2 条，含已撤销） ----------
      const sessionRows: Array<{
        userId: number;
        refreshSecretHash: string;
        expiresAt: Date;
        revokedAt: Date | null;
        revokeReason: 'LOGOUT' | 'PASSWORD_CHANGED' | 'ROLE_CHANGED' | null;
      }> = [];
      regularUserIds.forEach((userId, i) => {
        const count = 1 + (i % 2);
        for (let k = 0; k < count; k += 1) {
          const revoked = (i + k) % 5 === 0;
          sessionRows.push({
            userId,
            refreshSecretHash: randomUUID(),
            expiresAt: new Date(Date.now() + 30 * 24 * 3600_000),
            revokedAt: revoked
              ? new Date(Date.now() - 10 * 24 * 3600_000)
              : null,
            revokeReason: revoked
              ? (['LOGOUT', 'PASSWORD_CHANGED', 'ROLE_CHANGED'] as const)[
                  (i + k) % 3
                ]
              : null,
          });
        }
      });
      // 管理员也建一条活跃会话。
      sessionRows.push({
        userId: adminId,
        refreshSecretHash: randomUUID(),
        expiresAt: new Date(Date.now() + 30 * 24 * 3600_000),
        revokedAt: null,
        revokeReason: null,
      });
      await tx.session.createMany({
        data: sessionRows,
        skipDuplicates: true,
      });

      // ---------- 汇总输出 ----------
      const counts = {
        user: users.count,
        asset: assetRecords.length,
        category: CATEGORY_NAMES.length,
        tag: COUNTS.tags,
        article: articleRows.length,
        articleSnapshot: snapshotRows.length,
        articleInlineAsset: inlineRows.length,
        articleTagLink: articleTagRows.length,
        music: COUNTS.music,
        activity: COUNTS.activities,
        activityMusic: activityMusicRows.length,
        activityImageAsset: activityImageRows.length,
        comment: allCommentIds.length,
        userMessage: messageRows.length,
        session: sessionRows.length,
      };
      process.stdout.write(`Seeded with admin id=${adminId} (nonhana).\n`);
      process.stdout.write(`表行数：${JSON.stringify(counts, null, 2)}\n`);
    });
  } finally {
    await prisma.$disconnect();
  }
};

run().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exitCode = 1;
});

// ==================== 工具函数 ====================

const avatarUrl = (email: string) => {
  const hash = createHash('sha256')
    .update(email.trim().toLowerCase())
    .digest('hex');
  return `https://weavatar.com/avatar/${hash}`;
};

const spreadDate = (index: number, rangeDays: number): Date => {
  const base = Date.UTC(2020, 0, 1);
  const step = Math.floor((rangeDays * 86_400_000) / 2000);
  return new Date(base + (index % 2000) * step);
};

/**
 * 近 N 天窗口内的确定性时间戳（本地时区，逐日桶化）。
 * spreadDate 锚定 2020 年前铺，灌库时近 30 天窗口必然为空，导致概览趋势图
 * 与 last30d 恒 0 —— 这里的近期造数专门补齐该覆盖，让趋势可视化可验收。
 * 与概览 service 的本地日桶化（getFullYear/getMonth/getDate）口径一致。
 */
const recentDate = (index: number, windowDays = 30): Date => {
  const dayBack = index % windowDays;
  const hour = (index * 7) % 24;
  const minute = (index * 11) % 60;
  const date = new Date();
  date.setDate(date.getDate() - dayBack);
  date.setHours(hour, minute, 0, 0);
  return date;
};

const futureDate = (index: number): Date =>
  new Date(Date.now() + 86_400_000 * (1 + (index % 30)));

/**
 * 长尾抽样表：第 k 项权重 ≈ base/(k+1)，展开成可 `i % length` 取用的下标数组。
 *
 * 分类与标签均匀分配时，24 个分类各 33 篇、160 个标签各 17 篇，
 * 「内容构成」排行会是一排等长的条 —— 读起来跟坏掉没有区别。
 * 真实博客的分类/标签本来就是齐夫分布，造数照着来才验得动排序与排行。
 */
const longTailPicks = (size: number, base: number): number[] =>
  Array.from({ length: size }, (_, k) => Math.ceil(base / (k + 1))).flatMap(
    (weight, k) => Array.from({ length: weight }, () => k),
  );

const coverUrl = (assetId: number) =>
  `https://img.example.com/seed/${assetId}.jpg`;

const musicCover = (assetId: number) =>
  `https://img.example.com/seed/${assetId}.jpg`;

const imageAsset = (
  directory: string,
  seedIndex: number,
  ownerIds: number[],
  i: number,
  status: 'AVAILABLE' | 'PENDING_CLEANUP' | 'DELETED' = 'AVAILABLE',
) => {
  const byteSize = BigInt(8_000 + ((i * 2654435761) % 2_000_000));
  return {
    storageKey: `${directory}/2026/08/${randomUUID()}.jpg`,
    mediaType: 'IMAGE' as const,
    mimeType: ['image/jpeg', 'image/png', 'image/webp'][i % 3],
    byteSize,
    width: 400 + (i % 1600),
    height: 300 + ((i * 7) % 1200),
    durationMs: null,
    status,
    createdById: ownerIds[seedIndex % ownerIds.length],
    createdAt: spreadDate(i, 900),
    deletedAt:
      status === 'DELETED' ? new Date(Date.now() - 5 * 86_400_000) : null,
  };
};

const audioAsset = (
  directory: string,
  seedIndex: number,
  ownerIds: number[],
  i: number,
) => ({
  storageKey: `${directory}/2026/08/${randomUUID()}.mp3`,
  mediaType: 'AUDIO' as const,
  mimeType: ['audio/mpeg', 'audio/flac', 'audio/ogg'][i % 3],
  byteSize: BigInt(1_200_000 + ((i * 2654435761) % 18_000_000)),
  width: null,
  height: null,
  durationMs: 60_000 + ((i * 3700) % 480_000),
  status: 'AVAILABLE' as const,
  createdById: ownerIds[seedIndex % ownerIds.length],
  createdAt: spreadDate(i, 900),
  deletedAt: null,
});

// ==================== 文本池（千差万别，供检索命中） ====================

const CATEGORY_NAMES = [
  '前端开发',
  '后端工程',
  '数据库',
  '架构设计',
  '工程效率',
  '用户体验',
  '性能优化',
  '安全加固',
  '机器学习',
  '编程语言',
  '开源软件',
  '云原生',
  '测试策略',
  'DevOps',
  '数据可视化',
  '操作系统',
  '网络协议',
  '设计模式',
  '软件开发',
  '技术管理',
  '区块链',
  '游戏开发',
  '移动开发',
  '算法精讲',
] as const;

const SUMMARY = [
  '一篇写给工程团队的实践笔记',
  '从问题出发的完整推导',
  '适合新手入门的系统讲解',
  '踩坑记录与避坑指南',
  '深入浅出的源码分析',
  '结合真实案例的经验总结',
] as const;

const TITLE_TOPICS = [
  'React Hooks',
  'Vue 组合式开发',
  'TypeScript 类型体操',
  'Vite 构建优化',
  'Prisma ORM 实战',
  'PostgreSQL 索引设计',
  'Node.js 事件循环',
  'Hono 框架',
  'Rust 所有权',
  'Go 并发模型',
  'Rust 异步编程',
  'SwiftUI 布局',
  'Kubernetes 编排',
  'Docker 镜像瘦身',
  'Git 工作流',
  'CI/CD 流水线',
  'GraphQL 查询优化',
  'RESTful 设计规范',
  'WebSocket 实时通信',
  'SSE 服务推送',
  'HTTP/3 与 QUIC',
  'TLS 握手优化',
  'Redis 缓存策略',
  '消息队列选型',
  '单元测试覆盖',
  '端到端测试框架',
  '可观测性体系',
  '日志采集与分析',
  '监控告警最佳实践',
  '弹性伸缩设计',
  '微服务拆分',
  '领域驱动设计',
  '函数式编程',
  '响应式编程',
  '设计令牌',
  '无障碍访问',
] as const;

const SUBTITLE = [
  '从零到一到进阶',
  '原理与实现细节',
  '常见误区剖析',
  '性能与体验权衡',
  '实践中的取舍',
  '踩坑实录',
  '系统化方法论',
  '架构演进记录',
  '边界与约束',
  '重构与演进',
  '配方与速查',
  '源码阅读笔记',
] as const;

const articleTitle = (i: number) =>
  `${TITLE_TOPICS[i % TITLE_TOPICS.length]} 第 ${i + 1} 篇：${SUBTITLE[i % SUBTITLE.length]}`;

const WORD_COUNT_BASE = 1200;

const PARAGRAPH_HEAD = [
  '背景与动机：这一段先交代清楚要解决的问题，以及为什么值得投入。',
  '开篇先给出结论，从使用者视角描述现象，再逐层回溯根因。',
  '本文记录一次完整的排查过程，从复现、定位到修复与回归。',
  '先说适用范围，再展开原理，避免读者带着错误预期往下读。',
  '从最小可复现案例出发，逐步叠加复杂度，展示真实的推演路径。',
] as const;

const BODY_SNIPPETS = [
  '在实际工程中，过早的抽象往往比重复代码更难维护，因此要等到出现第二处真实调用点再提取。',
  '缓存失效是计算机科学里最难的两件事之一，设计时要同时考虑命中率、一致性与热点。',
  '衡量一次改动是否值得，要看它是否降低了长期维护成本，而不只是减少了今天的代码行数。',
  '索引并非越多越好，写放大与存储开销在数据量增长后会逐渐暴露。',
  '并发问题的根源在于共享可变状态，先缩小临界区，再谈锁的粒度。',
  '协议的每一处边界都要显式校验，信任是安全性的头号敌人。',
  '把失败当作一等公民：重试、退避、熔断与降级各司其职。',
  '测试的价值在于守卫可观察的行为契约，而非实现细节。',
  '日志要能回答「发生了什么」，指标要能回答「严重到什么程度」，链路要能回答「影响到了谁」。',
  '分层不是简单地把代码放进不同目录，而是让每一层只依赖更稳定的那一侧。',
  '函数式风格的收益在于可组合与可测试，代价是需要交代清楚副作用。',
  '性能优化的起点永远是测量，而不是直觉。',
] as const;

const articleBody = (i: number, part = 0): string => {
  const paragraphs: string[] = [];
  paragraphs.push(`# ${articleTitle(i)}\n`);
  paragraphs.push(`${PARAGRAPH_HEAD[i % PARAGRAPH_HEAD.length]}\n`);
  const count = 8 + (i % 6);
  for (let p = 0; p < count; p += 1) {
    const snippets = Array.from(
      { length: 2 + (p % 3) },
      (_, k) => BODY_SNIPPETS[(i + p * 3 + k) % BODY_SNIPPETS.length],
    );
    paragraphs.push(snippets.join(' '));
    if (p % 3 === 1) {
      paragraphs.push(`\n### 小节 ${p + 1}\n`);
      paragraphs.push('```ts\nconst result = compute(input);\n```\n');
    }
    if (p % 4 === 2) {
      paragraphs.push(
        '- 要点一：保持简单\n- 要点二：先度量\n- 要点三：再优化\n',
      );
    }
  }
  if (part > 0) {
    paragraphs.push(`> 第 ${part} 版快照补充说明：本文经历了一次修订。\n`);
  }
  return paragraphs.join('\n');
};

const ACTIVITY_HEAD = [
  '日常记录',
  '周末随笔',
  '跑步打卡',
  '读书笔记',
  '项目进度',
  '思考碎片',
  '技术分享会',
  '台风天的窗外',
  '午后的咖啡',
] as const;

const activityBody = (i: number): string =>
  `${ACTIVITY_HEAD[i % ACTIVITY_HEAD.length]}：${BODY_SNIPPETS[i % BODY_SNIPPETS.length]} #活动${i + 1}`;

const PARENT_COMMENT_OPENERS = [
  '很有启发，尤其是关于',
  '想问一下作者，这部分',
  '我一直没想明白',
  '受益匪浅，已收藏',
  '和我的实践一致',
  '有一点不同看法',
  '看完立刻去试了一下',
  '感谢分享，讲得很清楚',
  '有个疑问想请教',
  '写得很详尽',
] as const;

const CHILD_COMMENT_OPENERS = [
  '回复楼上：确实，我补充一点',
  '同问，蹲一个解答',
  '我试过另一种方案',
  '感谢解答，明白了',
  '楼上的例子很有帮助',
  '这里我也有经验',
] as const;

const COMMENT_TAIL = [
  '希望能有后续更新。',
  '思路值得借鉴。',
  '标记一下，回头细看。',
  '有同感，支持。',
  '实践出真知。',
  '期待下一篇。',
] as const;

const commentBody = (openers: readonly string[], i: number): string => {
  const opener = openers[i % openers.length];
  const topic = BODY_SNIPPETS[(i * 3) % BODY_SNIPPETS.length];
  return `${opener}「${topic.replace(/。$/, '')}」的心得。再多说几句：${COMMENT_TAIL[i % COMMENT_TAIL.length]}`;
};

const MUSIC_TITLES = [
  '夜航',
  '萤火',
  '晨雾',
  '长风',
  '雨街',
  '山月',
  '潮声',
  '旧梦',
  '微光',
  '远山',
  '白昼',
  '清晨',
  '林间',
  '星河',
  '风起',
  '海盐',
] as const;

const MUSIC_ARTISTS = [
  '云深不知处',
  '晚风工作室',
  '山茶乐队',
  '南屿',
  '拾光者',
  '漫游者',
  '晨昏线',
  '岛屿电台',
  '静水',
  '回声计划',
] as const;

const MUSIC_ALBUMS = [
  '四季',
  '旅人',
  '回声',
  '留白',
  '浮光',
  '经纬',
  '潮汐',
  '扉页',
] as const;
