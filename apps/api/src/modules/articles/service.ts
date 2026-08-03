import type {
  ArticleAdmin,
  ArticleCreateInput,
  ArticleDates,
  ArticleDetail,
  ArticleListAdminData,
  ArticleListAdminQuery,
  ArticleListData,
  ArticleListQuery,
  ArticleSaveInput,
  ArticleSearchItem,
  ArticleSearchListData,
  ArticleSnapshot,
  Neighbors,
  PreviewTokenData,
  Principal,
} from '@grey-flowers/contracts';
import type { Prisma, PrismaClient } from '@grey-flowers/db';

import type { ApiEnvironment } from '../../env.js';
import type { TaxonomyService } from '../taxonomy/service.js';

import { ApiError } from '../../http/errors.js';
import {
  articleListAdminProjection,
  toArticleAdmin,
  toArticleCard,
  toArticleDetail,
  toArticleListAdmin,
} from './contracts.js';
import {
  extractInlineAssetRefs,
  type InlineAssetRef,
} from './inline-assets.js';
import { createPreviewToken, verifyPreviewToken } from './preview-token.js';
import { normalizeArticleTo, slugifyTitle } from './slug.js';
import { countArticleWordCount } from './wordcount.js';

const DEFAULT_SEARCH_LIMIT = 8;
const MAX_SEARCH_LIMIT = 10;
const TITLE_TRIGRAM_THRESHOLD = 0.35;

interface SearchRow {
  id: number;
  to: string;
  title: string;
  description: string | null;
  content: string | null;
  category: string;
  tags: string[];
  publishedAt: Date;
  score: number | string;
}

function normalizeSearchQuery(value: string) {
  return value.replaceAll('"', ' ').trim();
}

function toPlainSearchText(value: string | null | undefined) {
  if (!value) return '';
  return value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[>*_~#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateSnippet(value: string, length = 120) {
  if (value.length <= length) return value;
  return `${value.slice(0, length).trim()}…`;
}

function extractSnippet(value: string, query: string) {
  const plainText = toPlainSearchText(value);
  if (!plainText) return '';

  const loweredText = plainText.toLowerCase();
  const loweredQuery = query.toLowerCase();
  const terms = Array.from(
    new Set(loweredQuery.split(/\s+/).filter(Boolean)),
  ).sort((a, b) => b.length - a.length);

  const phraseIndex = loweredText.indexOf(loweredQuery);
  const matchIndex =
    phraseIndex >= 0
      ? phraseIndex
      : (terms
          .map((term) => loweredText.indexOf(term))
          .find((index) => index >= 0) ?? -1);

  if (matchIndex < 0) return truncateSnippet(plainText);

  const start = Math.max(0, matchIndex - 32);
  const end = Math.min(
    plainText.length,
    matchIndex + Math.max(loweredQuery.length, 18) + 72,
  );

  let snippet = plainText.slice(start, end).trim();
  if (start > 0) snippet = `…${snippet}`;
  if (end < plainText.length) snippet = `${snippet}…`;
  return snippet;
}

function createSnippet(row: SearchRow, query: string) {
  const description = toPlainSearchText(row.description);
  const content = toPlainSearchText(row.content);
  const loweredQuery = query.toLowerCase();

  if (description && description.toLowerCase().includes(loweredQuery)) {
    return extractSnippet(description, query);
  }
  if (content && content.toLowerCase().includes(loweredQuery)) {
    return extractSnippet(content, query);
  }

  const fallback = description || content;
  return fallback ? truncateSnippet(fallback) : '暂无摘要';
}

/** cover/coverAssetId 归一：置 asset 则 cover=deliveryUrl；仅外部 URL 则 coverAssetId=null。 */
async function resolveCover(
  client: Prisma.TransactionClient,
  assetPublicUrl: string,
  cover: string,
  coverAssetId: number | null,
): Promise<{ cover: string; coverAssetId: number | null }> {
  if (coverAssetId !== null) {
    const asset = await client.asset.findUnique({
      select: { status: true, storageKey: true },
      where: { id: coverAssetId },
    });
    if (!asset || asset.status !== 'AVAILABLE') {
      throw new ApiError('VALIDATION_FAILED', {
        fields: { assets: ['Selected cover asset is not available'] },
      });
    }
    return {
      cover: `${assetPublicUrl.replace(/\/+$/, '')}/${asset.storageKey}`,
      coverAssetId,
    };
  }
  return { cover, coverAssetId: null };
}

async function assertCategoryExists(
  client: Prisma.TransactionClient,
  categoryId: number | null,
) {
  if (categoryId === null) return;
  const category = await client.category.findUnique({
    select: { id: true },
    where: { id: categoryId },
  });
  if (!category) {
    throw new ApiError('VALIDATION_FAILED', {
      fields: { categoryId: ['Selected category does not exist'] },
    });
  }
}

/** 校验正文受管引用：asset 存在且 AVAILABLE、URL 等于其 deliveryUrl；任一失败 → VALIDATION_FAILED。 */
async function assertContentAssets(
  client: Prisma.TransactionClient,
  assetPublicUrl: string,
  content: string,
): Promise<InlineAssetRef[]> {
  const refs = await extractInlineAssetRefs(content);
  if (refs.length === 0) return refs;

  const results = await Promise.all(
    refs.map(async (ref) => {
      const asset = await client.asset.findUnique({
        select: { status: true, storageKey: true },
        where: { id: ref.assetId },
      });
      const deliveryUrl = asset
        ? `${assetPublicUrl.replace(/\/+$/, '')}/${asset.storageKey}`
        : undefined;
      const matches =
        asset !== null &&
        asset.status === 'AVAILABLE' &&
        deliveryUrl === ref.url;
      return { matches, ref };
    }),
  );
  const failed = results
    .filter(({ matches }) => !matches)
    .map(
      ({ ref }) =>
        `asset #${ref.assetId} is not an available managed image matching its delivery URL`,
    );

  if (failed.length > 0) {
    throw new ApiError('VALIDATION_FAILED', {
      fields: { assets: failed },
    });
  }
  return refs;
}

function monthRange(month: string): Prisma.DateTimeFilter {
  const [year, monthNumber] = month.split('-').map(Number);
  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  const end = new Date(Date.UTC(year, monthNumber, 1));
  return { gte: start, lt: end };
}

export class ArticleService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly environment: ApiEnvironment,
    private readonly taxonomy: TaxonomyService,
  ) {}

  // ==================== 管理写 ====================

  async create(
    principal: Principal,
    input: ArticleCreateInput,
  ): Promise<ArticleAdmin> {
    return await this.prisma.$transaction(async (tx) => {
      const title = input.title.trim();
      const to = normalizeArticleTo(input.slug ?? slugifyTitle(title));

      const duplicate = await tx.article.findUnique({
        select: { to: true },
        where: { to },
      });
      if (duplicate) {
        const suggestion = await this.suggestSlug(tx, to);
        throw new ApiError('CONFLICT', {
          message: `Slug "${to}" is taken; try "${suggestion}"`,
        });
      }

      const tags = input.tags ?? [];
      const content = input.content ?? '';
      await assertCategoryExists(tx, input.categoryId ?? null);
      const inlineRefs = await assertContentAssets(
        tx,
        this.environment.ASSET_PUBLIC_URL,
        content,
      );
      const wordCount = countArticleWordCount(content);

      const { cover, coverAssetId } = await resolveCover(
        tx,
        this.environment.ASSET_PUBLIC_URL,
        input.cover ?? '',
        input.coverAssetId ?? null,
      );

      const published = input.published ?? false;
      const row = await tx.article.create({
        data: {
          alt: input.alt ?? title,
          categoryId: input.categoryId ?? null,
          content,
          cover,
          coverAssetId,
          description: input.description ?? null,
          editedAt: new Date(),
          published,
          publishedAt: new Date(),
          tags: {
            connectOrCreate: tags.map((name) => ({
              create: { name },
              where: { name },
            })),
          },
          title,
          to,
          wordCount,
        },
        select: {
          ...articleListAdminProjection,
          content: true,
        },
      });

      await this.rebuildInlineAssets(tx, row.id, inlineRefs);
      await this.taxonomy.recomputeTagCounts(tx, tags);
      await this.taxonomy.recomputeCategoryCount(tx, input.categoryId ?? null);

      const inlineAssetIds = await this.loadInlineAssetIds(tx, row.id);
      return toArticleAdmin(
        { ...row, categoryId: row.categoryId },
        inlineAssetIds,
      );
    });
  }

  /** 整稿保存（含 content）：乐观锁 + 受管引用校验 + 计数同步 + 可选快照。 */
  async save(
    principal: Principal,
    id: number,
    input: ArticleSaveInput,
  ): Promise<ArticleAdmin> {
    return await this.prisma.$transaction(async (tx) => {
      const existing = await tx.article.findUnique({
        select: {
          alt: true,
          categoryId: true,
          content: true,
          cover: true,
          coverAssetId: true,
          description: true,
          id: true,
          published: true,
          publishedAt: true,
          revision: true,
          tags: { select: { name: true } },
          title: true,
          to: true,
          wordCount: true,
        },
        where: { id },
      });
      if (!existing) throw new ApiError('NOT_FOUND');
      if (existing.revision !== input.expectedRevision) {
        throw new ApiError('ARTICLE_STALE');
      }

      if (input.preserveServerSnapshot === true) {
        await this.insertSnapshot(tx, {
          articleId: id,
          content: existing.content ?? '',
          createdById: principal.userId,
          description: existing.description,
          revision: existing.revision,
          title: existing.title,
          wordCount: existing.wordCount,
        });
      }

      const content = input.content ?? existing.content ?? '';
      const tags = input.tags ?? existing.tags.map((tag) => tag.name);
      const categoryId =
        input.categoryId !== undefined ? input.categoryId : existing.categoryId;
      await assertCategoryExists(tx, categoryId);
      const inlineRefs = await assertContentAssets(
        tx,
        this.environment.ASSET_PUBLIC_URL,
        content,
      );
      const wordCount = countArticleWordCount(content);
      const coverAssetId =
        input.coverAssetId !== undefined
          ? input.coverAssetId
          : existing.coverAssetId;
      const { cover, coverAssetId: resolvedCoverAssetId } = await resolveCover(
        tx,
        this.environment.ASSET_PUBLIC_URL,
        input.cover ?? existing.cover,
        coverAssetId,
      );

      // 先落缺失标签再整体 set，保证新标签可建、旧标签可摘除，且只写一次关联。
      if (tags.length > 0) {
        await tx.tag.createMany({
          data: tags.map((name) => ({ name })),
          skipDuplicates: true,
        });
      }

      const updated = await tx.article.update({
        data: {
          alt: input.alt ?? existing.alt,
          categoryId,
          content,
          cover,
          coverAssetId: resolvedCoverAssetId,
          description:
            input.description === undefined
              ? existing.description
              : input.description,
          editedAt: new Date(),
          publishedAt:
            input.publishedAt === undefined
              ? existing.publishedAt
              : new Date(input.publishedAt),
          revision: { increment: 1 },
          tags: { set: tags.map((name) => ({ name })) },
          title: input.title,
          wordCount,
        },
        select: {
          ...articleListAdminProjection,
          content: true,
        },
        where: { id },
      });

      await this.rebuildInlineAssets(tx, id, inlineRefs);

      const affectedTags = new Set([
        ...existing.tags.map((tag) => tag.name),
        ...tags,
      ]);
      await this.taxonomy.recomputeTagCounts(tx, [...affectedTags]);
      await this.taxonomy.recomputeCategoryCount(tx, existing.categoryId);
      await this.taxonomy.recomputeCategoryCount(tx, categoryId);

      if (input.createSnapshot === true) {
        await this.insertSnapshot(tx, {
          articleId: id,
          content,
          createdById: principal.userId,
          description:
            input.description === undefined
              ? existing.description
              : input.description,
          revision: existing.revision + 1,
          title: input.title,
          wordCount,
        });
      }

      const inlineAssetIds = await this.loadInlineAssetIds(tx, id);
      return toArticleAdmin({ ...updated, categoryId }, inlineAssetIds);
    });
  }

  async publish(principal: Principal, id: number): Promise<ArticleAdmin> {
    return await this.prisma.$transaction(async (tx) => {
      const existing = await this.lockArticleForWrite(tx, id);
      if (existing.published) return this.resolveAdmin(tx, id);

      const updated = await tx.article.update({
        data: {
          editedAt: new Date(),
          published: true,
          publishedAt: new Date(),
          revision: { increment: 1 },
        },
        select: {
          ...articleListAdminProjection,
          content: true,
        },
        where: { id },
      });

      await this.insertSnapshot(tx, {
        articleId: id,
        content: updated.content ?? '',
        createdById: principal.userId,
        description: updated.description,
        revision: existing.revision + 1,
        title: updated.title,
        wordCount: updated.wordCount,
      });
      await this.taxonomy.recomputeTagCounts(
        tx,
        updated.tags.map((tag) => tag.name),
      );
      await this.taxonomy.recomputeCategoryCount(tx, updated.categoryId);

      const inlineAssetIds = await this.loadInlineAssetIds(tx, id);
      return toArticleAdmin(
        { ...updated, categoryId: updated.categoryId },
        inlineAssetIds,
      );
    });
  }

  async unpublish(principal: Principal, id: number): Promise<ArticleAdmin> {
    return await this.prisma.$transaction(async (tx) => {
      const existing = await this.lockArticleForWrite(tx, id);
      if (!existing.published) return this.resolveAdmin(tx, id);

      const updated = await tx.article.update({
        data: {
          editedAt: new Date(),
          published: false,
          revision: { increment: 1 },
        },
        select: {
          ...articleListAdminProjection,
          content: true,
        },
        where: { id },
      });

      await this.insertSnapshot(tx, {
        articleId: id,
        content: updated.content ?? '',
        createdById: principal.userId,
        description: updated.description,
        revision: existing.revision + 1,
        title: updated.title,
        wordCount: updated.wordCount,
      });
      await this.taxonomy.recomputeTagCounts(
        tx,
        updated.tags.map((tag) => tag.name),
      );
      await this.taxonomy.recomputeCategoryCount(tx, updated.categoryId);

      const inlineAssetIds = await this.loadInlineAssetIds(tx, id);
      return toArticleAdmin(
        { ...updated, categoryId: updated.categoryId },
        inlineAssetIds,
      );
    });
  }

  async remove(principal: Principal, id: number): Promise<ArticleAdmin> {
    return await this.prisma.$transaction(async (tx) => {
      const existing = await tx.article.findUnique({
        select: {
          ...articleListAdminProjection,
          content: true,
          categoryId: true,
          inlineAssets: { select: { assetId: true } },
        },
        where: { id },
      });
      if (!existing) throw new ApiError('NOT_FOUND');

      const tags = existing.tags.map((tag) => tag.name);
      await tx.article.delete({ where: { id } });

      await this.taxonomy.recomputeTagCounts(tx, tags);
      await this.taxonomy.recomputeCategoryCount(tx, existing.categoryId);

      return toArticleAdmin(
        {
          ...existing,
          alt: existing.alt,
          category: existing.category,
          categoryId: existing.categoryId,
          content: existing.content ?? '',
          coverAssetId: existing.coverAssetId,
          editedAt: existing.editedAt,
          id,
          publishedAt: existing.publishedAt,
          revision: existing.revision,
        },
        existing.inlineAssets.map((ref) => ref.assetId),
      );
    });
  }

  // ==================== 管理读 ====================

  async listAdmin(query: ArticleListAdminQuery): Promise<ArticleListAdminData> {
    const where = {
      ...(query.status === 'all'
        ? {}
        : { published: query.status === 'published' }),
      ...(query.q === undefined ? {} : { title: { contains: query.q } }),
    };

    const [items, total] = await Promise.all([
      this.prisma.article.findMany({
        orderBy: { editedAt: 'desc' },
        select: articleListAdminProjection,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        where,
      }),
      this.prisma.article.count({ where }),
    ]);

    return {
      items: items.map(toArticleListAdmin),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async getAdmin(id: number): Promise<ArticleAdmin> {
    return await this.resolveAdmin(this.prisma, id);
  }

  async listSnapshots(
    articleId: number,
  ): Promise<{ items: ArticleSnapshot[] }> {
    const article = await this.prisma.article.findUnique({
      select: { id: true },
      where: { id: articleId },
    });
    if (!article) throw new ApiError('NOT_FOUND');

    const rows = await this.prisma.articleSnapshot.findMany({
      orderBy: { revision: 'desc' },
      select: {
        content: true,
        createdAt: true,
        description: true,
        id: true,
        revision: true,
        title: true,
        wordCount: true,
      },
      where: { articleId },
    });

    return {
      items: rows.map((row) => ({
        content: row.content,
        createdAt: row.createdAt.toISOString(),
        description: row.description,
        id: row.id,
        revision: row.revision,
        title: row.title,
        wordCount: row.wordCount,
      })),
    };
  }

  async createPreviewToken(id: number): Promise<PreviewTokenData> {
    const article = await this.prisma.article.findUnique({
      select: { revision: true },
      where: { id },
    });
    if (!article) throw new ApiError('NOT_FOUND');

    return createPreviewToken(this.environment, id, article.revision);
  }

  // ==================== 公开读 ====================

  async list(query: ArticleListQuery): Promise<ArticleListData> {
    const where = {
      published: true,
      ...(query.tag === undefined
        ? {}
        : { tags: { some: { name: query.tag } } }),
      ...(query.category === undefined
        ? {}
        : { category: { name: query.category } }),
      ...(query.month === undefined
        ? {}
        : {
            publishedAt: monthRange(query.month),
          }),
    };

    const [items, total] = await Promise.all([
      this.prisma.article.findMany({
        orderBy: { publishedAt: 'desc' },
        select: {
          category: { select: { name: true } },
          cover: true,
          description: true,
          editedAt: true,
          id: true,
          publishedAt: true,
          tags: { select: { name: true } },
          title: true,
          to: true,
          wordCount: true,
        },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        where,
      }),
      this.prisma.article.count({ where }),
    ]);

    return {
      items: items.map(toArticleCard),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async detail(path: string): Promise<ArticleDetail> {
    const row = await this.prisma.article.findUnique({
      select: {
        alt: true,
        category: { select: { name: true } },
        content: true,
        cover: true,
        description: true,
        editedAt: true,
        id: true,
        published: true,
        publishedAt: true,
        tags: { select: { name: true } },
        title: true,
        to: true,
        wordCount: true,
      },
      where: { to: path, published: true },
    });
    if (!row) throw new ApiError('NOT_FOUND');
    return toArticleDetail(row);
  }

  async count(
    query: Pick<ArticleListQuery, 'tag' | 'category' | 'month'>,
  ): Promise<{ count: number }> {
    const where = {
      published: true,
      ...(query.tag === undefined
        ? {}
        : { tags: { some: { name: query.tag } } }),
      ...(query.category === undefined
        ? {}
        : { category: { name: query.category } }),
      ...(query.month === undefined
        ? {}
        : { publishedAt: monthRange(query.month) }),
    };
    return { count: await this.prisma.article.count({ where }) };
  }

  async search(query: {
    q: string;
    limit: number;
  }): Promise<ArticleSearchListData> {
    const normalizedQuery = normalizeSearchQuery(query.q);
    const limit = Math.min(
      Math.max(query.limit || DEFAULT_SEARCH_LIMIT, 1),
      MAX_SEARCH_LIMIT,
    );

    if (!normalizedQuery) return { items: [] };

    const rows = await this.prisma.$queryRaw<SearchRow[]>`
      WITH input AS (
        SELECT
          ${normalizedQuery}::text AS raw_query,
          lower(${normalizedQuery}::text) AS lowered_query,
          websearch_to_tsquery('simple', ${normalizedQuery}::text) AS ts_query
      ),
      search_source AS (
        SELECT
          article.id,
          article."to" AS "to",
          article.title,
          article.description,
          article.content,
          article."publishedAt",
          COALESCE(category.name, '未分类') AS category,
          ARRAY(
            SELECT tag.name
            FROM "_ArticleTags" article_tags
            JOIN "Tag" tag ON tag.id = article_tags."B"
            WHERE article_tags."A" = article.id
            ORDER BY tag.name
          ) AS tags,
          (
            setweight(to_tsvector('simple', COALESCE(article.title, '')), 'A')
            || setweight(to_tsvector('simple', COALESCE(article.description, '')), 'B')
            || setweight(to_tsvector('simple', COALESCE(article.content, '')), 'C')
          ) AS document
        FROM "Article" article
        LEFT JOIN "Category" category ON category.id = article."categoryId"
        WHERE article.published = true
      ),
      ranked AS (
        SELECT
          source.*,
          source.document @@ input.ts_query AS text_hit,
          POSITION(input.lowered_query IN lower(source.title)) > 0 AS title_phrase_hit,
          POSITION(input.lowered_query IN lower(COALESCE(source.description, ''))) > 0 AS description_phrase_hit,
          POSITION(input.lowered_query IN lower(COALESCE(source.content, ''))) > 0 AS content_phrase_hit,
          EXISTS (
            SELECT 1
            FROM "_ArticleTags" article_tags
            JOIN "Tag" tag ON tag.id = article_tags."B"
            WHERE article_tags."A" = source.id
              AND (
                POSITION(input.lowered_query IN lower(tag.name)) > 0
                OR similarity(tag.name, input.raw_query) >= 0.2
              )
          ) AS tag_hit,
          (
            POSITION(input.lowered_query IN lower(source.category)) > 0
            OR similarity(source.category, input.raw_query) >= 0.2
          ) AS category_hit,
          source.title % input.raw_query AS title_trigram_hit,
          similarity(source.title, input.raw_query) AS title_similarity,
          ts_rank_cd(source.document, input.ts_query, 32) AS text_rank
        FROM search_source source
        CROSS JOIN input
      ),
      filtered AS (
        SELECT
          *,
          (
            CASE WHEN title_phrase_hit THEN 14 ELSE 0 END
            + CASE WHEN tag_hit THEN 9 ELSE 0 END
            + CASE WHEN category_hit THEN 8 ELSE 0 END
            + CASE WHEN description_phrase_hit THEN 6 ELSE 0 END
            + CASE WHEN content_phrase_hit THEN 5 ELSE 0 END
            + CASE WHEN text_hit THEN text_rank * 10 ELSE 0 END
            + CASE WHEN title_trigram_hit AND title_similarity >= ${TITLE_TRIGRAM_THRESHOLD} THEN title_similarity * 4 ELSE 0 END
          ) AS score
        FROM ranked
        WHERE
          title_phrase_hit
          OR description_phrase_hit
          OR content_phrase_hit
          OR tag_hit
          OR category_hit
          OR text_hit
          OR (title_trigram_hit AND title_similarity >= ${TITLE_TRIGRAM_THRESHOLD})
      )
      SELECT
        id,
        "to",
        title,
        description,
        content,
        category,
        tags,
        "publishedAt",
        score
      FROM filtered
      ORDER BY score DESC, "publishedAt" DESC, id DESC
      LIMIT ${limit}
    `;

    const items: ArticleSearchItem[] = rows.map((row) => ({
      to: row.to,
      title: row.title,
      description: row.description?.trim() || '',
      category: row.category,
      tags: row.tags,
      publishedAt: row.publishedAt.toISOString(),
      snippet: createSnippet(row, normalizedQuery),
      score: Number(row.score),
    }));

    return { items };
  }

  async neighbors(path: string): Promise<Neighbors> {
    const current = await this.prisma.article.findUnique({
      select: { publishedAt: true },
      where: { to: path, published: true },
    });
    if (!current) return [null, null];

    const [prev, next] = await Promise.all([
      this.prisma.article.findFirst({
        orderBy: { publishedAt: 'desc' },
        select: { title: true, to: true },
        where: {
          published: true,
          publishedAt: { lt: current.publishedAt },
          title: { notIn: ['About', 'Friends'] },
        },
      }),
      this.prisma.article.findFirst({
        orderBy: { publishedAt: 'asc' },
        select: { title: true, to: true },
        where: {
          published: true,
          publishedAt: { gt: current.publishedAt },
          title: { notIn: ['About', 'Friends'] },
        },
      }),
    ]);

    return [
      prev ? { title: prev.title, to: prev.to } : null,
      next ? { title: next.title, to: next.to } : null,
    ];
  }

  async dates(): Promise<ArticleDates> {
    const rows = await this.prisma.article.findMany({
      select: { publishedAt: true },
      where: { published: true },
    });

    const map = new Map<string, Set<string>>();
    for (const { publishedAt } of rows) {
      const year = String(publishedAt.getFullYear());
      const month = String(publishedAt.getMonth() + 1).padStart(2, '0');
      const months = map.get(year) ?? new Set<string>();
      months.add(month);
      map.set(year, months);
    }

    const result: ArticleDates = {};
    for (const [year, months] of map) {
      result[year] = [...months];
    }
    return result;
  }

  /** 公开预览：token 门控，返回含草稿正文的详情。 */
  async preview(path: string, token: string): Promise<ArticleDetail> {
    const claims = verifyPreviewToken(this.environment, token);
    if (!claims) throw new ApiError('AUTH_FORBIDDEN');

    const row = await this.prisma.article.findUnique({
      select: {
        alt: true,
        category: { select: { name: true } },
        content: true,
        cover: true,
        description: true,
        editedAt: true,
        id: true,
        published: true,
        publishedAt: true,
        revision: true,
        tags: { select: { name: true } },
        title: true,
        to: true,
        wordCount: true,
      },
      where: { id: claims.articleId },
    });
    if (!row) throw new ApiError('NOT_FOUND');
    if (row.to !== path) throw new ApiError('AUTH_FORBIDDEN');
    if (row.revision !== claims.revision) throw new ApiError('ARTICLE_STALE');

    const { revision: _revision, ...detailRow } = row;
    return toArticleDetail(detailRow);
  }

  // ==================== 私有 ====================

  private async loadInlineAssetIds(
    client: PrismaClient | Prisma.TransactionClient,
    articleId: number,
  ): Promise<number[]> {
    const rows = await client.articleInlineAsset.findMany({
      select: { assetId: true },
      where: { articleId },
    });
    return rows.map((row) => row.assetId).sort((a, b) => a - b);
  }

  private async rebuildInlineAssets(
    client: Prisma.TransactionClient,
    articleId: number,
    refs: InlineAssetRef[],
  ) {
    await client.articleInlineAsset.deleteMany({ where: { articleId } });
    if (refs.length > 0) {
      await client.articleInlineAsset.createMany({
        data: refs.map((ref) => ({
          articleId,
          assetId: ref.assetId,
        })),
      });
    }
  }

  private async insertSnapshot(
    client: Prisma.TransactionClient,
    input: {
      articleId: number;
      content: string;
      createdById: number;
      description: string | null;
      revision: number;
      title: string;
      wordCount: number;
    },
  ) {
    await client.articleSnapshot.create({
      data: {
        articleId: input.articleId,
        content: input.content,
        createdById: input.createdById,
        description: input.description,
        revision: input.revision,
        title: input.title,
        wordCount: input.wordCount,
      },
    });
  }

  private async lockArticleForWrite(
    client: Prisma.TransactionClient,
    id: number,
  ) {
    const existing = await client.article.findUnique({
      select: {
        ...articleListAdminProjection,
        content: true,
        published: true,
      },
      where: { id },
    });
    if (!existing) throw new ApiError('NOT_FOUND');
    return existing;
  }

  private async resolveAdmin(
    client: PrismaClient | Prisma.TransactionClient,
    id: number,
  ): Promise<ArticleAdmin> {
    const row = await client.article.findUnique({
      select: {
        ...articleListAdminProjection,
        content: true,
        categoryId: true,
      },
      where: { id },
    });
    if (!row) throw new ApiError('NOT_FOUND');
    const inlineAssetIds = await this.loadInlineAssetIds(client, id);
    return toArticleAdmin(
      { ...row, categoryId: row.categoryId },
      inlineAssetIds,
    );
  }

  private async suggestSlug(
    client: Prisma.TransactionClient,
    to: string,
  ): Promise<string> {
    const candidates = Array.from(
      { length: 98 },
      (_, index) => `${to}-${index + 2}`,
    );
    const existing = await client.article.findMany({
      select: { to: true },
      where: { to: { in: candidates } },
    });
    const taken = new Set(existing.map((row) => row.to));
    return (
      candidates.find((candidate) => !taken.has(candidate)) ??
      `${to}-${Date.now()}`
    );
  }
}
