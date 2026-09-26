import type { Work, WorkAdmin } from '@grey-flowers/contracts';
import type { Prisma } from '@grey-flowers/db';

export const workProjection: Prisma.WorkSelect = {
  color: true,
  createdAt: true,
  description: true,
  id: true,
  image: true,
  owner: true,
  site: true,
  sortOrder: true,
  updatedAt: true,
  url: true,
};

interface WorkRecord extends Prisma.WorkGetPayload<{
  select: typeof workProjection;
}> {}

/** 公开读：7 个公开字段白名单；createdAt/sortOrder/updatedAt 仅管理端可见。 */
export const toWork = (record: WorkRecord): Work => {
  return {
    color: record.color,
    description: record.description,
    id: record.id,
    image: record.image,
    owner: record.owner,
    site: record.site,
    url: record.url,
  };
};

export const toWorkAdmin = (record: WorkRecord): WorkAdmin => {
  return {
    ...record,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
};
