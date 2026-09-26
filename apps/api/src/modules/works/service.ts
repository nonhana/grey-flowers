import type {
  Work,
  WorkAdmin,
  WorkCreateInput,
  WorkListData,
  WorkLogoConfirmData,
  WorkLogoConfirmInput,
  WorkLogoRemoveData,
  WorkLogoUploadUrlData,
  WorkLogoUploadUrlInput,
  WorkUpdateInput,
} from '@grey-flowers/contracts';
import type { Prisma, PrismaClient } from '@grey-flowers/db';

import { WORK_LOGO_MAX_BYTES } from '@grey-flowers/contracts';

import type { ObjectStorage } from '@/adapters/object-storage/r2';

import { ApiError } from '@/http/errors';
import { isUniqueConstraint } from '@/lib/prisma';

import { toWork, toWorkAdmin, workProjection } from './contracts';
import {
  buildLogoKey,
  LOGO_KEY_PREFIX,
  logoContentTypeOfKey,
  logoDeliveryUrl,
  logoKeyFromUrl,
} from './logo';

/**
 * 作品集用例。列表不分页（条目十位数，无检索）；url 唯一冲突映射 CONFLICT；
 * reorder 要求 ids 与全表 id 全集完全一致（无缺失、无重复、无多余），按数组
 * 顺序单事务写 sortOrder。Logo 直传复用原资产桶（works-logo/ 前缀、文件名即
 * key 末段），移除时只删 works-logo/ 下的对象、其余一律只清字段。
 */
export class WorksService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly objectStorage: ObjectStorage,
    private readonly publicUrl: string,
  ) {}

  async list(): Promise<WorkListData> {
    const rows = await this.prisma.work.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      select: workProjection,
    });
    return { items: rows.map(toWorkAdmin) };
  }

  async listPublic(): Promise<{ items: Work[] }> {
    const rows = await this.prisma.work.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      select: workProjection,
    });
    return { items: rows.map(toWork) };
  }

  async create(input: WorkCreateInput): Promise<WorkAdmin> {
    const max = await this.prisma.work.aggregate({
      _max: { sortOrder: true },
    });

    try {
      const row = await this.prisma.work.create({
        data: {
          color: input.color ?? null,
          description: input.description,
          image: input.image,
          owner: input.owner,
          site: input.site,
          sortOrder: (max._max.sortOrder ?? 0) + 1,
          url: input.url,
        },
        select: workProjection,
      });
      return toWorkAdmin(row);
    } catch (error) {
      if (isUniqueConstraint(error))
        throw new ApiError('CONFLICT', { cause: error });
      throw error;
    }
  }

  async update(id: number, input: WorkUpdateInput): Promise<WorkAdmin> {
    const existing = await this.prisma.work.findUnique({
      select: { id: true },
      where: { id },
    });
    if (!existing) throw new ApiError('NOT_FOUND');

    const data: Prisma.WorkUpdateInput = {};
    if (input.site !== undefined) data.site = input.site;
    if (input.owner !== undefined) data.owner = input.owner;
    if (input.url !== undefined) data.url = input.url;
    if (input.image !== undefined) data.image = input.image;
    if (input.description !== undefined) data.description = input.description;
    if (input.color !== undefined) data.color = input.color;

    try {
      const row = await this.prisma.work.update({
        data,
        select: workProjection,
        where: { id },
      });
      return toWorkAdmin(row);
    } catch (error) {
      if (isUniqueConstraint(error))
        throw new ApiError('CONFLICT', { cause: error });
      throw error;
    }
  }

  async remove(id: number): Promise<{ id: number }> {
    const existing = await this.prisma.work.findUnique({
      select: { id: true },
      where: { id },
    });
    if (!existing) throw new ApiError('NOT_FOUND');

    await this.prisma.work.delete({ where: { id } });
    return { id };
  }

  /** 排序：ids 全集校验失败 → VALIDATION_FAILED；否则按索引写 sortOrder。 */
  async reorder(ids: number[]): Promise<{ ids: number[] }> {
    const rows = await this.prisma.work.findMany({
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
        this.prisma.work.update({
          data: { sortOrder: index + 1 },
          where: { id },
        }),
      ),
    );
    return { ids };
  }

  /** Logo 直传第一步：文件名即 key 末段；HEAD 防覆盖后签发原资产桶 PUT URL。 */
  async createLogoUploadUrl(
    input: WorkLogoUploadUrlInput,
  ): Promise<WorkLogoUploadUrlData> {
    if (input.size !== undefined && input.size > WORK_LOGO_MAX_BYTES) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `Logo 不能超过 ${Math.floor(WORK_LOGO_MAX_BYTES / 1024 / 1024)}MB`,
      });
    }
    const key = buildLogoKey(input.filename);
    if (key === null) {
      throw new ApiError('VALIDATION_FAILED', {
        message:
          '文件名仅支持中英文、数字、点、下划线、连字符，且必须带图片扩展名（avif/gif/jpeg/png/svg/webp）',
      });
    }
    if (await this.logoObjectExists(key)) {
      throw new ApiError('CONFLICT', {
        message: '已有同名 Logo 文件，请修改文件名后重试',
      });
    }
    const contentType = logoContentTypeOfKey(key);
    if (contentType === undefined) {
      throw new ApiError('VALIDATION_FAILED', { message: '不支持的图片格式' });
    }
    const uploadUrl = await this.objectStorage.presignUpload({
      contentType,
      key,
    });
    return { contentType, key, maxBytes: WORK_LOGO_MAX_BYTES, uploadUrl };
  }

  /** Logo 直传第三步：HEAD 校验对象存在后换取公开 delivery URL。 */
  async confirmLogoUpload(
    input: WorkLogoConfirmInput,
  ): Promise<WorkLogoConfirmData> {
    if (
      !input.key.startsWith(LOGO_KEY_PREFIX) ||
      logoContentTypeOfKey(input.key) === undefined
    ) {
      throw new ApiError('VALIDATION_FAILED', {
        message: 'key 必须位于 works-logo/ 前缀下且为受支持的图片格式',
      });
    }
    if (!(await this.logoObjectExists(input.key))) {
      throw new ApiError('NOT_FOUND', {
        message: '上传对象不存在，请重新上传',
      });
    }
    return { deliveryUrl: logoDeliveryUrl(this.publicUrl, input.key) };
  }

  /**
   * 移除 Logo：只删 works-logo/ 前缀下的对象（受管资产等共享桶内文件不受
   * 影响）；外链或前缀外的 URL 只清字段。image 已空时幂等返回。
   */
  async removeLogo(id: number): Promise<WorkLogoRemoveData> {
    const work = await this.prisma.work.findUnique({
      select: { id: true, image: true },
      where: { id },
    });
    if (!work) throw new ApiError('NOT_FOUND');
    if (work.image === '') return { id };

    const key = logoKeyFromUrl(this.publicUrl, work.image);
    if (key !== null && key.startsWith(LOGO_KEY_PREFIX)) {
      await this.objectStorage.deleteObject(key);
    }
    await this.prisma.work.update({ data: { image: '' }, where: { id } });
    return { id };
  }

  private async logoObjectExists(key: string): Promise<boolean> {
    try {
      await this.objectStorage.headObject(key);
      return true;
    } catch (error) {
      if (
        (error as { $metadata?: { httpStatusCode?: number } }).$metadata
          ?.httpStatusCode === 404
      ) {
        return false;
      }
      throw error;
    }
  }
}
