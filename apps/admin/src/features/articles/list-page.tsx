import type { ArticleListAdmin } from '@grey-flowers/contracts';

import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { cn } from 'cnfast';
import { FileText, SearchX, SquarePen } from 'lucide-react';
import { useEffect, useState } from 'react';

import { apiClient } from '@/app/api/index.js';
import { useDerivedReset } from '@/hooks/use-derived-reset.js';
import { formatDateTime } from '@/lib/format.js';
import {
  Alert,
  Button,
  buttonClass,
  EmptyState,
  FilterChip,
  MetaLine,
  PageBody,
  PageHeader,
  Paginator,
  PublishBadge,
  RowStack,
  SearchInput,
  Skeleton,
} from '@/ui/index.js';

import type { ArticleStatusFilter } from './display.js';

import { parseStatusFilter } from './display.js';

const PAGE_SIZE = 20;

const FILTERS = [
  { label: '全部', search: {}, status: 'all' },
  { label: '草稿', search: { status: 'draft' }, status: 'draft' },
  { label: '已发布', search: { status: 'published' }, status: 'published' },
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

/** 行布局骨架与真实行共用：标题 / 描述 / 元数据三段的行高永远同步。 */
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

/**
 * 与真实行同构的行骨架：块高按真实字号的 line-height 取 em，
 * 徽章 / 日期位按固定高度取 —— 行高与真实逐段相等，落地时零跳动。
 */
const ArticleRowSkeleton = () => (
  <div aria-hidden="true" className={ARTICLE_ROW_LAYOUT}>
    <div className="flex items-start justify-between gap-3">
      <Skeleton className="h-[1.6em] w-48 text-md" />
      {/* 发布徽章：text-2xs lh 1.45 + py-0.5 ≈ 20px */}
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
        <SquarePen aria-hidden="true" className="size-4" />
        新建文章
      </Link>
    }
    icon={<FileText aria-hidden="true" />}
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
    icon={<SearchX aria-hidden="true" />}
    title={`没有标题匹配「${query}」`}
  >
    搜索只匹配标题。换个关键词，或者清除搜索看看全部文章。
  </EmptyState>
);

export const ArticlesListPage = () => {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { status?: unknown };
  const status = parseStatusFilter(search.status);

  const [items, setItems] = useState<ArticleListAdmin[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 每一次按键都发一次请求既浪费也让列表抖动，落后 250ms 再查。
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  // 请求条件一变就在渲染期切回加载态（React 官方的「按输入调整 state」模式）。
  // 放进 effect 里会触发级联渲染。
  const requestKey = `${status}|${debouncedQuery}|${String(page)}|${String(reloadKey)}`;
  useDerivedReset(requestKey, () => {
    setLoading(true);
    setError(null);
  });

  useEffect(() => {
    let cancelled = false;

    void apiClient.articles
      .list({ page, pageSize: PAGE_SIZE, q: debouncedQuery, status })
      .then((data) => {
        if (cancelled) return;
        setItems(data.items);
        setTotal(data.total);
      })
      .catch((loadError: unknown) => {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : '加载失败。');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, page, reloadKey, status]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const isSearching = debouncedQuery.trim().length > 0;

  return (
    <PageBody scroll="child">
      {/* 搜索是这一屏唯一的控件，跟标题同排；桌面端的状态筛选由侧栏子项承担。 */}
      <PageHeader
        actions={
          <SearchInput
            className="
              hidden w-64
              md:block
            "
            label="搜索文章标题"
            onChange={setQuery}
            placeholder="搜索标题…"
            value={query}
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
                setPage(1);
                void navigate({ search: filter.search, to: '/articles' });
              }}
            >
              {filter.label}
            </FilterChip>
          ))}
        </div>
        <SearchInput
          label="搜索文章标题"
          onChange={setQuery}
          placeholder="搜索标题…"
          value={query}
        />
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {loading ? (
          <RowStack className="animate-content-in" key="skeleton">
            {Array.from({ length: PAGE_SIZE }, (_, index) => (
              <ArticleRowSkeleton key={index} />
            ))}
          </RowStack>
        ) : error ? (
          <Alert
            action={
              <Button
                onPress={() => setReloadKey((current) => current + 1)}
                size="sm"
              >
                重试
              </Button>
            }
          >
            {error}
          </Alert>
        ) : items.length === 0 ? (
          isSearching ? (
            <EmptySearch onClear={() => setQuery('')} query={debouncedQuery} />
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
          onChange={setPage}
          page={page}
          total={total}
          totalPages={totalPages}
          unit="篇"
        />
      ) : null}
    </PageBody>
  );
};
