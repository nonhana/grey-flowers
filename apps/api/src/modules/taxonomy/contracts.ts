import type {
  CategoryAdmin,
  PublicCategory,
  PublicTag,
  TagAdmin,
} from '@grey-flowers/contracts';

export const tagProjection = {
  articleCount: true,
  id: true,
  name: true,
} as const;

export interface TagRecord {
  articleCount: number;
  id: number;
  name: string;
}

export function toTagAdmin(record: TagRecord): TagAdmin {
  return {
    articleCount: record.articleCount,
    id: record.id,
    name: record.name,
  };
}

export const categoryProjection = {
  articleCount: true,
  cover: true,
  coverAssetId: true,
  id: true,
  name: true,
} as const;

export interface CategoryRecord {
  articleCount: number;
  cover: string;
  coverAssetId: number | null;
  id: number;
  name: string;
}

export function toCategoryAdmin(record: CategoryRecord): CategoryAdmin {
  return {
    articleCount: record.articleCount,
    cover: record.cover,
    coverAssetId: record.coverAssetId,
    id: record.id,
    name: record.name,
  };
}

interface TagWithPublishedCount {
  name: string;
  _count: {
    articles: number;
  };
}

export function toPublicTag(record: TagWithPublishedCount): PublicTag {
  return { count: record._count.articles, name: record.name };
}

interface CategoryWithPublishedCount {
  cover: string;
  id: number;
  name: string;
  _count: {
    articles: number;
  };
}

export function toPublicCategory(
  record: CategoryWithPublishedCount,
): PublicCategory {
  return {
    articleCount: record._count.articles,
    cover: record.cover,
    id: record.id,
    name: record.name,
  };
}
