import type {
  Friend,
  FriendAdmin,
  FriendCreateInput,
  FriendListData,
  FriendUpdateInput,
} from '@grey-flowers/contracts';
import type { Prisma, PrismaClient } from '@grey-flowers/db';

import { ApiError } from '@/http/errors';
import { isUniqueConstraint } from '@/lib/prisma';

import { friendLinkProjection, toFriend, toFriendAdmin } from './contracts';

/**
 * 友链用例。列表不分页（条目十位数，无检索）；url 唯一冲突映射 CONFLICT；
 * reorder 要求 ids 与全表 id 全集完全一致（无缺失、无重复、无多余），按数组
 * 顺序单事务写 sortOrder。构造函数只依赖 prisma。
 */
export class FriendsService {
  constructor(private readonly prisma: PrismaClient) {}

  async list(): Promise<FriendListData> {
    const rows = await this.prisma.friendLink.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      select: friendLinkProjection,
    });
    return { items: rows.map(toFriendAdmin) };
  }

  async listPublic(): Promise<{ items: Friend[] }> {
    const rows = await this.prisma.friendLink.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      select: friendLinkProjection,
    });
    return { items: rows.map(toFriend) };
  }

  async create(input: FriendCreateInput): Promise<FriendAdmin> {
    const max = await this.prisma.friendLink.aggregate({
      _max: { sortOrder: true },
    });

    try {
      const row = await this.prisma.friendLink.create({
        data: {
          color: input.color ?? null,
          description: input.description,
          image: input.image,
          owner: input.owner,
          site: input.site,
          sortOrder: (max._max.sortOrder ?? 0) + 1,
          url: input.url,
        },
        select: friendLinkProjection,
      });
      return toFriendAdmin(row);
    } catch (error) {
      if (isUniqueConstraint(error))
        throw new ApiError('CONFLICT', { cause: error });
      throw error;
    }
  }

  async update(id: number, input: FriendUpdateInput): Promise<FriendAdmin> {
    const existing = await this.prisma.friendLink.findUnique({
      select: { id: true },
      where: { id },
    });
    if (!existing) throw new ApiError('NOT_FOUND');

    const data: Prisma.FriendLinkUpdateInput = {};
    if (input.site !== undefined) data.site = input.site;
    if (input.owner !== undefined) data.owner = input.owner;
    if (input.url !== undefined) data.url = input.url;
    if (input.image !== undefined) data.image = input.image;
    if (input.description !== undefined) data.description = input.description;
    if (input.color !== undefined) data.color = input.color;

    try {
      const row = await this.prisma.friendLink.update({
        data,
        select: friendLinkProjection,
        where: { id },
      });
      return toFriendAdmin(row);
    } catch (error) {
      if (isUniqueConstraint(error))
        throw new ApiError('CONFLICT', { cause: error });
      throw error;
    }
  }

  async remove(id: number): Promise<{ id: number }> {
    const existing = await this.prisma.friendLink.findUnique({
      select: { id: true },
      where: { id },
    });
    if (!existing) throw new ApiError('NOT_FOUND');

    await this.prisma.friendLink.delete({ where: { id } });
    return { id };
  }

  /** 排序：ids 全集校验失败 → VALIDATION_FAILED；否则按索引写 sortOrder。 */
  async reorder(ids: number[]): Promise<{ ids: number[] }> {
    const rows = await this.prisma.friendLink.findMany({
      select: { id: true },
    });
    const current = new Set(rows.map((row) => row.id));
    if (
      ids.length !== rows.length ||
      new Set(ids).size !== ids.length ||
      !ids.every((id) => current.has(id))
    ) {
      throw new ApiError('VALIDATION_FAILED', {
        message: 'ids 必须与当前列表的 id 全集完全一致（无缺失、重复或多余）',
      });
    }

    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.friendLink.update({
          data: { sortOrder: index + 1 },
          where: { id },
        }),
      ),
    );
    return { ids };
  }
}
