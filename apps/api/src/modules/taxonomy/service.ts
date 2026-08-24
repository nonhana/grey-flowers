import type {
  CategoryAdmin,
  CategoryListData,
  CategorySaveInput,
  PublicCategoryListData,
  PublicTagListData,
  TagAdmin,
  TagCreateInput,
  TagListData,
  TagListQuery,
} from '@grey-flowers/contracts';
import type { Prisma, PrismaClient } from '@grey-flowers/db';

import type { ApiEnvironment } from '@/env.js';

import { ApiError } from '@/http/errors.js';
import { isUniqueConstraint } from '@/lib/prisma.js';

import { assertAvailableAssetDeliveryUrl } from '../assets/managed-asset.js';
import {
  categoryProjection,
  tagProjection,
  toCategoryAdmin,
  toPublicCategory,
  toPublicTag,
  toTagAdmin,
} from './contracts.js';

/** 分类封面归一：置 asset 则 cover=deliveryUrl；仅外部 URL 则 coverAssetId=null。 */
const normalizeCategoryCover = async (
  prisma: PrismaClient,
  assetPublicUrl: string,
  cover: string,
  coverAssetId: number | null | undefined,
): Promise<{ cover: string; coverAssetId: number | null }> => {
  if (coverAssetId === undefined || coverAssetId === null) {
    return { cover, coverAssetId: null };
  }
  return {
    cover: await assertAvailableAssetDeliveryUrl(
      prisma,
      assetPublicUrl,
      coverAssetId,
    ),
    coverAssetId,
  };
};

export class TaxonomyService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly environment: ApiEnvironment,
  ) {}

  async listCategories(): Promise<CategoryListData> {
    const rows = await this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      select: categoryProjection,
    });
    return { items: rows.map(toCategoryAdmin) };
  }

  async createCategory(input: CategorySaveInput): Promise<CategoryAdmin> {
    const { cover, coverAssetId } = await normalizeCategoryCover(
      this.prisma,
      this.environment.ASSET_PUBLIC_URL,
      input.cover,
      input.coverAssetId,
    );

    try {
      const row = await this.prisma.category.create({
        data: {
          articleCount: 0,
          cover,
          coverAssetId,
          name: input.name.trim(),
        },
        select: categoryProjection,
      });
      return toCategoryAdmin(row);
    } catch (error) {
      if (isUniqueConstraint(error))
        throw new ApiError('CONFLICT', { cause: error });
      throw error;
    }
  }

  async updateCategory(
    id: number,
    input: CategorySaveInput,
  ): Promise<CategoryAdmin> {
    const existing = await this.prisma.category.findUnique({
      select: { id: true },
      where: { id },
    });
    if (!existing) throw new ApiError('NOT_FOUND');

    const name = input.name.trim();
    const duplicate = await this.prisma.category.findFirst({
      select: { id: true },
      where: { id: { not: id }, name },
    });
    if (duplicate) throw new ApiError('CONFLICT');

    const { cover, coverAssetId } = await normalizeCategoryCover(
      this.prisma,
      this.environment.ASSET_PUBLIC_URL,
      input.cover,
      input.coverAssetId,
    );

    const row = await this.prisma.category.update({
      data: { cover, coverAssetId, name },
      select: categoryProjection,
      where: { id },
    });
    return toCategoryAdmin(row);
  }

  async deleteCategory(id: number): Promise<{ id: number }> {
    const existing = await this.prisma.category.findUnique({
      select: {
        id: true,
        _count: { select: { articles: true } },
      },
      where: { id },
    });
    if (!existing) throw new ApiError('NOT_FOUND');
    if (existing._count.articles > 0) throw new ApiError('CONFLICT');

    await this.prisma.category.delete({ where: { id } });
    return { id };
  }

  async listTags(query: TagListQuery): Promise<TagListData> {
    const rows = await this.prisma.tag.findMany({
      orderBy: { articleCount: 'desc' },
      select: tagProjection,
      where: query.unused === 'true' ? { articles: { none: {} } } : {},
    });
    return { items: rows.map(toTagAdmin) };
  }

  async createTag(input: TagCreateInput): Promise<TagAdmin> {
    try {
      const row = await this.prisma.tag.create({
        data: { articleCount: 0, name: input.name.trim() },
        select: tagProjection,
      });
      return toTagAdmin(row);
    } catch (error) {
      if (isUniqueConstraint(error))
        throw new ApiError('CONFLICT', { cause: error });
      throw error;
    }
  }

  /** 管理写：删除标签（引用随之解除；无其余计数变化） */
  async deleteTag(id: number): Promise<{ id: number }> {
    const existing = await this.prisma.tag.findUnique({
      select: { id: true },
      where: { id },
    });
    if (!existing) throw new ApiError('NOT_FOUND');

    await this.prisma.tag.delete({ where: { id } });
    return { id };
  }

  async listPublicTags(): Promise<PublicTagListData> {
    const rows = await this.prisma.tag.findMany({
      orderBy: { name: 'asc' },
      select: {
        name: true,
        _count: { select: { articles: { where: { published: true } } } },
      },
    });
    return { items: rows.map(toPublicTag) };
  }

  async listPublicCategories(): Promise<PublicCategoryListData> {
    const rows = await this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      select: {
        cover: true,
        id: true,
        name: true,
        _count: { select: { articles: { where: { published: true } } } },
      },
    });
    return { items: rows.map(toPublicCategory) };
  }

  /** 事务内按 count(articles) 重算受影响标签计数 */
  async recomputeTagCounts(
    client: Prisma.TransactionClient,
    tagNames: string[],
  ): Promise<void> {
    const uniqueNames = [...new Set(tagNames)];
    if (uniqueNames.length === 0) return;

    const rows = await client.tag.findMany({
      select: { id: true, name: true },
      where: { name: { in: uniqueNames } },
    });

    await Promise.all(
      rows.map(async ({ id, name }) => {
        const count = await client.article.count({
          where: { tags: { some: { name } } },
        });
        await client.tag.update({
          data: { articleCount: count },
          where: { id },
        });
      }),
    );
  }

  /** 事务内按 count(articles) 重算受影响分类计数 */
  async recomputeCategoryCount(
    client: Prisma.TransactionClient,
    categoryId: number | null,
  ): Promise<void> {
    if (categoryId === null) return;
    const count = await client.article.count({
      where: { categoryId },
    });
    await client.category.update({
      data: { articleCount: count },
      where: { id: categoryId },
    });
  }
}
