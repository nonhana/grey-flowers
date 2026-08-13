import type {
  ArticleAdmin,
  ArticleCard,
  ArticleDetail,
  ArticleListAdmin,
} from '@grey-flowers/contracts';
import type { ArticleSelect } from '@grey-flowers/db';

export const articleListAdminProjection: ArticleSelect = {
  alt: true,
  category: { select: { name: true } },
  categoryId: true,
  cover: true,
  coverAssetId: true,
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
};

export interface ArticleListAdminRecord {
  alt: string;
  category: { name: string } | null;
  categoryId: number | null;
  cover: string;
  coverAssetId: number | null;
  description: string | null;
  editedAt: Date;
  id: number;
  published: boolean;
  publishedAt: Date;
  revision: number;
  tags: { name: string }[];
  title: string;
  to: string;
  wordCount: number;
}

export const toArticleListAdmin = (
  record: ArticleListAdminRecord,
): ArticleListAdmin => {
  return {
    alt: record.alt,
    category: record.category?.name ?? null,
    categoryId: record.categoryId,
    cover: record.cover,
    coverAssetId: record.coverAssetId,
    description: record.description,
    editedAt: record.editedAt.toISOString(),
    id: record.id,
    published: record.published,
    publishedAt: record.publishedAt.toISOString(),
    revision: record.revision,
    tags: record.tags.map((tag) => tag.name),
    title: record.title,
    to: record.to,
    wordCount: record.wordCount,
  };
};

export interface ArticleCardRecord {
  category: { name: string } | null;
  cover: string;
  description: string | null;
  editedAt: Date;
  id: number;
  publishedAt: Date;
  tags: { name: string }[];
  title: string;
  to: string;
  wordCount: number;
}

export const toArticleCard = (record: ArticleCardRecord): ArticleCard => {
  return {
    category: record.category?.name ?? null,
    cover: record.cover,
    description: record.description,
    editedAt: record.editedAt.toISOString(),
    id: record.id,
    publishedAt: record.publishedAt.toISOString(),
    tags: record.tags.map((tag) => tag.name),
    title: record.title,
    to: record.to,
    wordCount: record.wordCount,
  };
};

export interface ArticleDetailRecord extends ArticleCardRecord {
  alt: string;
  content: string | null;
  published: boolean;
}

export const toArticleDetail = (record: ArticleDetailRecord): ArticleDetail => {
  return {
    ...toArticleCard(record),
    alt: record.alt,
    content: record.content ?? '',
    published: record.published,
  };
};

export const toArticleAdmin = (
  record: ArticleDetailRecord & {
    categoryId: number | null;
    coverAssetId: number | null;
    id: number;
    revision: number;
  },
  inlineAssetIds: number[],
): ArticleAdmin => {
  return {
    ...toArticleDetail(record),
    categoryId: record.categoryId,
    coverAssetId: record.coverAssetId,
    id: record.id,
    inlineAssetIds,
    revision: record.revision,
  };
};
