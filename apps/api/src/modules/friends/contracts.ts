import type { Friend, FriendAdmin } from '@grey-flowers/contracts';
import type { Prisma } from '@grey-flowers/db';

export const friendLinkProjection = {
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
} satisfies Prisma.FriendLinkSelect;

interface FriendLinkRecord extends Prisma.FriendLinkGetPayload<{
  select: typeof friendLinkProjection;
}> {}

export const toFriend = (record: FriendLinkRecord): Friend => {
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

export const toFriendAdmin = (record: FriendLinkRecord): FriendAdmin => {
  return {
    ...record,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
};
