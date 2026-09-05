import type { OverviewPendingItem } from '@grey-flowers/contracts';
import type { LucideIcon } from 'lucide-react';

import { Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { ChevronRight, FileText, Images, Music2 } from 'lucide-react';

import { Skeleton } from '@/ui/feedback.js';
import { SectionLabel } from '@/ui/surface.js';

interface PendingMeta {
  icon: LucideIcon;
  label: string;
  search: Record<string, unknown>;
  to: '/articles' | '/assets' | '/music';
}

const PENDING_META: Record<OverviewPendingItem['key'], PendingMeta> = {
  draft_articles: {
    icon: FileText,
    label: '草稿文章',
    search: { status: 'draft' },
    to: '/articles',
  },
  pending_cleanup_assets: {
    icon: Images,
    label: '待清理资产',
    search: { status: 'PENDING_CLEANUP' },
    to: '/assets',
  },
  incomplete_music: {
    icon: Music2,
    label: '缺元数据音乐',
    search: { incomplete: true },
    to: '/music',
  },
};

export const PendingPanel = ({
  className,
  items,
}: {
  className?: string;
  items: readonly OverviewPendingItem[];
}) => {
  const visible = items.filter((item) => item.count > 0);

  return (
    <section className={cn('grid gap-2', className)}>
      <SectionLabel>待处理</SectionLabel>

      {visible.length === 0 ? (
        <p className="font-mono text-2xs text-ink-dim">无待办。</p>
      ) : (
        <div
          className="
            grid gap-px overflow-hidden rounded-panel border border-rule bg-rule
          "
          style={{
            gridTemplateColumns: 'repeat(auto-fit, minmax(15rem, 1fr))',
          }}
        >
          {visible.map((item) => {
            const meta = PENDING_META[item.key];
            if (!meta) return null;

            return (
              <Link
                className="
                  group flex items-center gap-2.5 bg-case-raised px-4 py-3.5
                  transition-colors
                  hover:bg-accent-wash
                "
                key={item.key}
                search={meta.search}
                to={meta.to}
              >
                <meta.icon
                  aria-hidden
                  className="
                    size-4 shrink-0 text-ink-dim transition-colors
                    group-hover:text-accent-text
                  "
                />
                <span
                  className="
                    min-w-0 flex-1 truncate text-base text-ink
                    group-hover:text-accent-text
                  "
                >
                  {meta.label}
                </span>
                <span
                  className="
                    font-mono text-md font-medium text-ink-strong
                    transition-colors
                    group-hover:text-accent-text
                  "
                >
                  {item.count}
                </span>
                <ChevronRight
                  aria-hidden
                  className="
                    size-4 shrink-0 text-ink-dim transition-colors
                    group-hover:text-accent-text
                  "
                />
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
};

export const PendingPanelSkeleton = () => (
  <section aria-hidden className="grid animate-content-in gap-2">
    <SectionLabel>待处理</SectionLabel>
    <div
      className="
        grid gap-px overflow-hidden rounded-panel border border-rule bg-rule
      "
      style={{
        gridTemplateColumns: 'repeat(auto-fit, minmax(15rem, 1fr))',
      }}
    >
      {Array.from({ length: 3 }, (_, index) => (
        <div
          className="flex items-center gap-2.5 bg-case-raised px-4 py-3.5"
          key={index}
        >
          <Skeleton className="size-4 shrink-0" />
          <Skeleton className="h-[1.55em] min-w-0 flex-1 text-base" />
          <Skeleton className="h-[1.6em] w-10 text-md" />
          <Skeleton className="size-4 shrink-0" />
        </div>
      ))}
    </div>
  </section>
);
