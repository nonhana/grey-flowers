import type { ArticleListAdmin } from '@grey-flowers/contracts';

import { Link } from '@tanstack/react-router';
import { cn } from 'cnfast';
import { FilePlus2, Loader2, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Button } from 'react-aria-components';

import { apiClient } from '@/app/api/index.js';

import { formatDateTime, publishedLabel } from './display.js';

const PAGE_SIZE = 20;

type StatusFilter = 'all' | 'draft' | 'published';

export const ArticlesListPage = () => {
  const [items, setItems] = useState<ArticleListAdmin[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void apiClient.articles
      .list({ page, pageSize: PAGE_SIZE, q: query, status })
      .then((data) => {
        if (cancelled) return;
        setItems(data.items);
        setTotal(data.total);
        setLoading(false);
      })
      .catch((loadError: unknown) => {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : '加载失败。');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, query, status]);

  const statusChip = useCallback(
    (value: StatusFilter, label: string) => (
      <button
        className={cn(
          'min-h-10 rounded-full border px-3.5 font-mono text-[0.76rem]',
          status === value
            ? 'border-brand bg-vapor text-brand'
            : `
              border-edge text-ink-soft
              hover:border-input-hover-edge
            `,
        )}
        key={value}
        onClick={() => {
          setStatus(value);
          setPage(1);
          setLoading(true);
          setError(null);
        }}
        type="button"
      >
        {label}
      </button>
    ),
    [status],
  );

  return (
    <div className="mx-auto w-full max-w-4xl p-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[1.4rem] font-medium text-ink-strong">文章</h1>
        <Link
          className="
            inline-flex min-h-11 items-center gap-2 rounded-control border
            border-transparent bg-primary px-4 font-mono text-[0.82rem]
            text-on-primary transition-colors
            hover:bg-primary-deep
            focus-visible:outline-[3px] focus-visible:outline-offset-2
            focus-visible:outline-focus-outline
            [&_svg]:size-4
          "
          to="/articles/new"
        >
          <FilePlus2 aria-hidden="true" />
          新建文章
        </Link>
      </header>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5">
          {statusChip('all', '全部')}
          {statusChip('draft', '草稿')}
          {statusChip('published', '已发布')}
        </div>
        <div className="relative ml-auto min-w-56">
          <Search
            aria-hidden="true"
            className="
              absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-faint
            "
          />
          <input
            aria-label="搜索文章标题"
            className="
              min-h-11 w-full rounded-control border border-input-edge bg-input
              pr-3 pl-9 text-[0.9rem] text-primary-ink outline-none
              placeholder:text-input-placeholder
              hover:border-input-hover-edge
              focus-visible:border-focus focus-visible:ring-[3px]
              focus-visible:ring-focus-ring
            "
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
              setLoading(true);
              setError(null);
            }}
            placeholder="搜索标题…"
            value={query}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {loading ? (
          <div className="flex justify-center py-12 text-ink-faint">
            <Loader2 aria-hidden="true" className="animate-spin" />
          </div>
        ) : error ? (
          <p
            className="
              rounded-control border border-danger-edge bg-danger-soft px-4 py-3
              text-[0.85rem] text-danger-ink
            "
            role="alert"
          >
            {error}
          </p>
        ) : items.length === 0 ? (
          <p className="py-12 text-center text-ink-muted">暂无匹配的文章。</p>
        ) : (
          items.map((article) => (
            <Link
              className="
                group grid gap-1.5 rounded-panel border border-edge bg-surface
                p-4 transition-colors
                hover:border-accent-hover-edge
                focus-visible:outline-[3px] focus-visible:outline-offset-2
                focus-visible:outline-focus-outline
              "
              key={article.id}
              to="/articles/$articleId"
              params={{ articleId: String(article.id) }}
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className="
                    text-[0.95rem] font-medium text-ink-strong
                    group-hover:text-brand
                  "
                >
                  {article.title || '（未命名）'}
                </span>
                <span
                  className={cn(
                    `
                      shrink-0 rounded-full border px-2 py-0.5 font-mono
                      text-[0.68rem]
                    `,
                    article.published
                      ? 'border-brand/30 bg-vapor text-brand'
                      : 'bg-accent text-ink-soft',
                  )}
                >
                  {publishedLabel(article.published)}
                </span>
              </div>
              <p className="truncate text-[0.82rem] text-ink-muted">
                {article.description || '无简介'}
              </p>
              <div
                className="
                  flex flex-wrap items-center gap-x-3 font-mono text-[0.7rem]
                  text-ink-faint
                "
              >
                <span>{article.category ?? '未分类'}</span>
                <span>{article.tags.join(' · ') || '无标签'}</span>
                <span>{article.wordCount} 字</span>
                <span>rev {article.revision}</span>
                <span className="ml-auto">
                  {formatDateTime(article.editedAt)}
                </span>
              </div>
            </Link>
          ))
        )}
      </div>

      {total > PAGE_SIZE ? (
        <div
          className="
            mt-5 flex items-center justify-center gap-2 font-mono text-[0.78rem]
          "
        >
          <Button
            className="
              min-h-11 rounded-control border border-edge px-4 text-ink-soft
              hover:bg-accent
            "
            isDisabled={page <= 1}
            onPress={() => {
              setPage((current) => current - 1);
              setLoading(true);
              setError(null);
            }}
          >
            上一页
          </Button>
          <span className="px-2 text-ink-faint">
            第 {page} 页 / 共 {Math.max(1, Math.ceil(total / PAGE_SIZE))} 页
          </span>
          <Button
            className="
              min-h-11 rounded-control border border-edge px-4 text-ink-soft
              hover:bg-accent
            "
            isDisabled={page * PAGE_SIZE >= total}
            onPress={() => {
              setPage((current) => current + 1);
              setLoading(true);
              setError(null);
            }}
          >
            下一页
          </Button>
        </div>
      ) : null}
    </div>
  );
};
