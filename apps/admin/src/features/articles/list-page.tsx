import type { ArticleListAdmin } from '@grey-flowers/contracts';

import { useQuery } from '@tanstack/react-query';
import { Link, useSearch } from '@tanstack/react-router';
import { cn } from 'cn';
import { FileText, SearchX, SquarePen } from 'lucide-react';
import { useEffect, useEffectEvent, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

import { articlesListOptions } from '@/app/server-state/modules/articles';
import { useSearchNavigation } from '@/hooks/use-search-navigation';
import { formatDateTime } from '@/lib/format';
import { Button, buttonClass } from '@/ui/button';
import { Alert, EmptyState, PublishBadge, Skeleton } from '@/ui/feedback';
import { FilterChip, SearchInput } from '@/ui/form';
import { Paginator } from '@/ui/paginator';
import { MetaLine, PageBody, PageHeader, RowStack } from '@/ui/surface';

import type { ArticleStatusFilter } from './display';

const PAGE_SIZE = 20;

const FILTERS = [
  { label: '全部', status: 'all' },
  { label: '草稿', status: 'draft' },
  { label: '已发布', status: 'published' },
] as const;

const EMPTY_TITLE: Record<ArticleStatusFilter, string> = {
  all: '这座花园还没有文章',
  draft: '没有草稿在等你',
  published: '还没有文章对访客可见',
};

const EMPTY_COPY: Record<ArticleStatusFilter, string> = {
  all: '写下第一篇。它会先以草稿形式保存，随时可以回来继续，发布是另一个动作。',
  draft: '新建的文章会先落在这里，发布之后才会离开草稿。',
  published: '在编辑页打开元数据面板，点「发布」，文章就会出现在主站上。',
};

const ARTICLE_ROW_LAYOUT = 'grid gap-1.5 px-4 py-3.5';

const ArticleRow = ({ article }: { article: ArticleListAdmin }) => (
  <Link
    className={cn(
      ARTICLE_ROW_LAYOUT,
      `
        group transition-colors
        hover:bg-accent-wash
      `,
    )}
    params={{ articleId: String(article.id) }}
    to="/articles/$articleId"
  >
    <div className="flex items-start justify-between gap-3">
      <span
        className="
          text-md font-bold text-ink-strong
          group-hover:text-accent-text
        "
      >
        {article.title || '（未命名）'}
      </span>
      <PublishBadge published={article.published} />
    </div>
    <p className="truncate text-base text-ink-dim">
      {article.description || '无简介'}
    </p>
    <MetaLine>
      <span>{article.category ?? '未分类'}</span>
      <span>{article.tags.join(' · ') || '无标签'}</span>
      <span>{article.wordCount} 字</span>
      <span>rev {article.revision}</span>
      <span className="ml-auto">{formatDateTime(article.editedAt)}</span>
    </MetaLine>
  </Link>
);

const ArticleRowSkeleton = () => (
  <div aria-hidden className={ARTICLE_ROW_LAYOUT}>
    <div className="flex items-start justify-between gap-3">
      <Skeleton className="h-[1.6em] w-48 text-md" />
      <Skeleton className="h-5 w-14" />
    </div>
    <Skeleton className="h-[1.55em] w-3/5 text-base" />
    <MetaLine>
      <Skeleton className="h-[1.45em] w-14 text-2xs" />
      <Skeleton className="h-[1.45em] w-24 text-2xs" />
      <Skeleton className="h-[1.45em] w-12 text-2xs" />
      <Skeleton className="h-[1.45em] w-10 text-2xs" />
      <Skeleton className="ml-auto h-[1.45em] w-28 text-2xs" />
    </MetaLine>
  </div>
);

const EmptyArticles = ({ status }: { status: ArticleStatusFilter }) => (
  <EmptyState
    action={
      <Link className={buttonClass({ tone: 'solid' })} to="/articles/new">
        <SquarePen aria-hidden className="size-4" />
        新建文章
      </Link>
    }
    icon={<FileText aria-hidden />}
    title={EMPTY_TITLE[status]}
  >
    {EMPTY_COPY[status]}
  </EmptyState>
);

const EmptySearch = ({
  onClear,
  query,
}: {
  onClear: () => void;
  query: string;
}) => (
  <EmptyState
    action={<Button onPress={onClear}>清除搜索</Button>}
    icon={<SearchX aria-hidden />}
    title={`没有标题匹配「${query}」`}
  >
    搜索只匹配标题。换个关键词，或者清除搜索看看全部文章。
  </EmptyState>
);

export const ArticlesListPage = () => {
  const search = useSearch({ from: '/articles/' });
  const status = search.status ?? 'all';
  const page = search.page ?? 1;

  const navigateSearch = useSearchNavigation('/articles', search);

  const [draft, setDraft] = useState(() => search.q ?? '');
  const commitQuery = useDebouncedCallback((value: string) => {
    navigateSearch({ page: undefined, q: value.trim() || undefined }, true);
  }, 250);

  useEffect(() => () => commitQuery.cancel(), [commitQuery]);

  const articlesQuery = useQuery(
    articlesListOptions({
      page,
      pageSize: PAGE_SIZE,
      q: search.q,
      status,
    }),
  );
  const items = articlesQuery.data?.items ?? [];
  const total = articlesQuery.data?.total ?? 0;
  const loading = articlesQuery.isPending;
  const error = articlesQuery.error;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const isSearching = search.q !== undefined;

  const clamping =
    items.length === 0 && page > 1 && total > 0 && totalPages < page;

  const syncClampedPage = useEffectEvent(() => {
    navigateSearch({ page: totalPages > 1 ? totalPages : undefined }, true);
  });

  useEffect(() => {
    if (clamping) syncClampedPage();
  }, [clamping]);

  return (
    <PageBody scroll="child">
      <PageHeader
        actions={
          <SearchInput
            className="
              hidden w-64
              md:block
            "
            label="搜索文章标题"
            onChange={(value) => {
              setDraft(value);
              commitQuery(value);
            }}
            placeholder="搜索标题…"
            value={draft}
          />
        }
        description="草稿与已发布都在这里。点开任意一篇进入写作台。"
        title="文章"
      />

      <div
        className="
          mt-5 grid gap-3
          md:hidden
        "
      >
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((filter) => (
            <FilterChip
              isSelected={status === filter.status}
              key={filter.status}
              onPress={() => {
                navigateSearch({
                  page: undefined,
                  status: filter.status === 'all' ? undefined : filter.status,
                });
              }}
            >
              {filter.label}
            </FilterChip>
          ))}
        </div>
        <SearchInput
          label="搜索文章标题"
          onChange={(value) => {
            setDraft(value);
            commitQuery(value);
          }}
          placeholder="搜索标题…"
          value={draft}
        />
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {loading || clamping ? (
          <RowStack className="animate-content-in" key="skeleton">
            {Array.from({ length: PAGE_SIZE }, (_, index) => (
              <ArticleRowSkeleton key={index} />
            ))}
          </RowStack>
        ) : error ? (
          <Alert
            action={
              <Button onPress={() => void articlesQuery.refetch()} size="sm">
                重试
              </Button>
            }
          >
            {error.message}
          </Alert>
        ) : items.length === 0 ? (
          isSearching ? (
            <EmptySearch
              onClear={() => {
                setDraft('');
                navigateSearch({ page: undefined, q: undefined }, true);
              }}
              query={search.q ?? ''}
            />
          ) : (
            <EmptyArticles status={status} />
          )
        ) : (
          <RowStack className="animate-content-in" key="content">
            {items.map((article) => (
              <ArticleRow article={article} key={article.id} />
            ))}
          </RowStack>
        )}
      </div>

      {!loading ? (
        <Paginator
          className="mt-5"
          onChange={(next) =>
            navigateSearch({ page: next > 1 ? next : undefined })
          }
          page={page}
          total={total}
          totalPages={totalPages}
          unit="篇"
        />
      ) : null}
    </PageBody>
  );
};
