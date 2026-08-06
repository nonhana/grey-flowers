import type {
  CommentAdmin,
  CommentAdminTree,
  CommentListData,
} from '@grey-flowers/contracts';

import { parseDate } from '@internationalized/date';
import { cn } from 'cnfast';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CloudOff,
  Filter,
  MessagesSquare,
  RotateCcw,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Button as AriaButton,
  Calendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  CalendarHeading,
  DateInput,
  DatePicker,
  DateSegment,
  Group,
  Popover,
} from 'react-aria-components';
import { toast } from 'sonner';

import { apiClient } from '@/app/api/index.js';
import { toastError } from '@/lib/toast.js';
import {
  BottomSheet,
  Button,
  ConfirmDialog,
  EmptyState,
  IconButton,
  MetaLine,
  PageBody,
  PageHeader,
  RowSkeleton,
  SearchInput,
  TextField,
  controlClass,
} from '@/ui/index.js';

import { CommentCard } from './comment-card.js';
import { ReplyDialog, type ReplyTarget } from './reply-dialog.js';
import { SessionDialog } from './session-dialog.js';

const PAGE_SIZE = 20;

interface CommentFilterDraft {
  authorId: string;
  endDate: string;
  path: string;
  search: string;
  startDate: string;
}

const EMPTY_FILTER: CommentFilterDraft = {
  authorId: '',
  endDate: '',
  path: '',
  search: '',
  startDate: '',
};
const dateGroupClass = cn(
  controlClass,
  'flex min-w-0 items-center gap-1 px-2',
  'focus-within:border-accent focus-within:outline-2',
  'focus-within:outline-offset-1 focus-within:outline-focus',
);
const dateRangeClass = cn(
  'grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-1.5 gap-y-2',
  'md:flex md:gap-1.5',
);
const desktopFilterControlsClass = 'mt-5 hidden md:block';
const mobileFilterControlsClass = 'mt-5 md:hidden';

const CommentDatePicker = ({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) => (
  <DatePicker
    aria-label={label}
    className="min-w-0 flex-1"
    onChange={(date) => onChange(date?.toString() ?? '')}
    value={value ? parseDate(value) : null}
  >
    <Group className={dateGroupClass}>
      <DateInput className="flex min-w-0 flex-1 items-center overflow-hidden">
        {(segment) => (
          <DateSegment
            className={({ isFocused, isPlaceholder }) =>
              cn(
                'rounded-sm px-0.5 outline-none',
                isPlaceholder && 'text-ink-dim',
                isFocused && 'bg-accent-wash text-accent-text',
              )
            }
            segment={segment}
          />
        )}
      </DateInput>
      <AriaButton
        aria-label={`打开${label}日历`}
        className="
          grid size-8 shrink-0 place-items-center rounded-control text-ink-dim
          transition-colors
          hover:bg-accent-wash hover:text-accent-text
        "
        slot="trigger"
      >
        <CalendarDays aria-hidden="true" className="size-4" />
      </AriaButton>
    </Group>

    <Popover
      className="
        w-[min(20rem,calc(100vw-2rem))] rounded-panel bg-case-raised p-3
        shadow-float outline-none
      "
      offset={8}
      placement="bottom start"
    >
      <Calendar className="grid gap-3">
        <header className="flex items-center gap-1">
          <AriaButton
            aria-label="上个月"
            className="
              grid size-8 place-items-center rounded-control text-ink-dim
              transition-colors
              hover:bg-accent-wash hover:text-accent-text
            "
            slot="previous"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
          </AriaButton>
          <CalendarHeading className="flex-1 text-center font-mono text-xs text-ink-strong" />
          <AriaButton
            aria-label="下个月"
            className="
              grid size-8 place-items-center rounded-control text-ink-dim
              transition-colors
              hover:bg-accent-wash hover:text-accent-text
            "
            slot="next"
          >
            <ChevronRight aria-hidden="true" className="size-4" />
          </AriaButton>
        </header>

        <CalendarGrid className="w-full table-fixed border-separate border-spacing-0">
          <CalendarGridHeader>
            {(day) => (
              <CalendarHeaderCell className="h-7 text-center font-mono text-2xs text-ink-dim">
                {day}
              </CalendarHeaderCell>
            )}
          </CalendarGridHeader>
          <CalendarGridBody>
            {(date) => (
              <CalendarCell
                className={({ isSelected, isToday }) =>
                  cn(
                    `
                      mx-auto grid size-9 place-items-center rounded-control
                      font-mono text-xs transition-colors
                    `,
                    isSelected
                      ? 'bg-accent text-accent-on'
                      : `
                        text-ink
                        hover:bg-accent-wash hover:text-accent-text
                      `,
                    isToday && !isSelected && 'font-medium text-accent-text',
                  )
                }
                date={date}
              />
            )}
          </CalendarGridBody>
        </CalendarGrid>
      </Calendar>
    </Popover>
  </DatePicker>
);

const FilterControls = ({
  onChange,
  value,
}: {
  onChange: (next: CommentFilterDraft) => void;
  value: CommentFilterDraft;
}) => {
  const set = (field: keyof CommentFilterDraft) => {
    return (fieldValue: string) => onChange({ ...value, [field]: fieldValue });
  };
  const hasFilter =
    value.search !== '' ||
    value.path !== '' ||
    value.authorId !== '' ||
    value.startDate !== '' ||
    value.endDate !== '';

  return (
    <section
      aria-label="筛选评论"
      className="
        grid grid-cols-1 gap-3
        md:grid-cols-2
        xl:grid-cols-[minmax(12rem,1fr)_minmax(12rem,1fr)_8rem_minmax(20rem,1.2fr)_auto]
      "
    >
      <div className="grid min-w-0 gap-1.5">
        <span className="font-mono text-xs text-ink-dim">评论内容</span>
        <SearchInput
          className="min-w-0"
          label="搜索评论内容"
          onChange={set('search')}
          placeholder="搜索内容…"
          value={value.search}
        />
      </div>
      <TextField
        className="min-w-0"
        inputClassName="font-mono text-xs"
        label="页面路径"
        onChange={set('path')}
        placeholder="/recently?id=12"
        value={value.path}
      />
      <TextField
        className="min-w-0"
        inputClassName="font-mono text-xs"
        label="作者 ID"
        onChange={set('authorId')}
        placeholder="作者 ID"
        value={value.authorId}
      />
      <div className="grid min-w-0 gap-1.5">
        <span className="font-mono text-xs text-ink-dim">发表日期</span>
        <div className={dateRangeClass}>
          <span aria-hidden="true" className="shrink-0 text-xs text-ink-dim">
            从
          </span>
          <CommentDatePicker
            label="开始日期"
            onChange={set('startDate')}
            value={value.startDate}
          />
          <span aria-hidden="true" className="shrink-0 text-xs text-ink-dim">
            至
          </span>
          <CommentDatePicker
            label="结束日期"
            onChange={set('endDate')}
            value={value.endDate}
          />
        </div>
      </div>
      {hasFilter ? (
        <Button
          className="self-end justify-self-start"
          icon={<RotateCcw aria-hidden="true" />}
          onPress={() => onChange(EMPTY_FILTER)}
          size="md"
          tone="ghost"
        >
          重置
        </Button>
      ) : null}
    </section>
  );
};

const toReplyTarget = (comment: CommentAdmin): ReplyTarget => ({
  content: comment.content,
  id: comment.id,
  username: comment.author.username,
});

export const CommentsPage = () => {
  const [draft, setDraft] = useState<CommentFilterDraft>(EMPTY_FILTER);
  const [filters, setFilters] = useState<CommentFilterDraft>(EMPTY_FILTER);
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [data, setData] = useState<CommentListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const [session, setSession] = useState<CommentAdminTree | null>(null);
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    childrenCount: number;
    comment: CommentAdmin;
  } | null>(null);
  const [batchOpen, setBatchOpen] = useState(false);

  // 全部筛选输入统一防抖 300ms；任一变化回到第一页。
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(draft);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [draft]);

  // 请求条件一变就在渲染期切回加载态（React 官方的「按输入调整 state」模式）。
  const requestKey = `${JSON.stringify(filters)}|${String(page)}|${String(reloadKey)}`;
  const [prevRequestKey, setPrevRequestKey] = useState(requestKey);
  if (prevRequestKey !== requestKey) {
    setPrevRequestKey(requestKey);
    setLoading(true);
    setError('');
  }

  useEffect(() => {
    let cancelled = false;
    const authorId = Number.parseInt(filters.authorId, 10);

    apiClient.comments
      .list({
        page,
        pageSize: PAGE_SIZE,
        ...(filters.search ? { search: filters.search } : {}),
        ...(filters.path ? { path: filters.path } : {}),
        ...(Number.isInteger(authorId) && authorId > 0 ? { authorId } : {}),
        ...(filters.startDate ? { startDate: filters.startDate } : {}),
        ...(filters.endDate ? { endDate: filters.endDate } : {}),
      })
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        if (!cancelled) setError('无法加载评论，请稍后重试。');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filters, page, reloadKey]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const hasFilter =
    filters.search !== '' ||
    filters.path !== '' ||
    filters.authorId !== '' ||
    filters.startDate !== '' ||
    filters.endDate !== '';

  const toggleSelect = (id: number) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const reload = () => setReloadKey((current) => current + 1);

  const removeSingle = async () => {
    if (!deleteTarget) return;
    const { comment } = deleteTarget;
    setDeleteTarget(null);
    try {
      const result = await apiClient.comments.remove(comment.id);
      if (session?.id === comment.id) setSession(null);
      toast.success(
        `已删除 ${result.deleted} 条评论${
          result.cascade > 0 ? `（含 ${result.cascade} 条回复）` : ''
        }。`,
      );
      reload();
    } catch (cause) {
      toastError(cause);
    }
  };

  const removeBatch = async () => {
    if (selectedIds.size === 0) return;
    const ids = [...selectedIds];
    setBatchOpen(false);
    setSelectedIds(new Set());
    try {
      const result = await apiClient.comments.removeBatch(ids);
      toast.success(`已删除 ${result.deleted} 条评论。`);
      reload();
    } catch (cause) {
      toastError(cause);
    }
  };

  return (
    <PageBody width="wide">
      <PageHeader
        actions={
          <MetaLine>{data ? <span>共 {data.total} 条</span> : null}</MetaLine>
        }
        description="评论与人互动都在这里；回复会通知作者，删除前请确认级联影响。"
        title="评论"
      />

      <div className={desktopFilterControlsClass}>
        <FilterControls onChange={setDraft} value={draft} />
      </div>
      <div className={mobileFilterControlsClass}>
        <span className="mb-1.5 block font-mono text-xs text-ink-dim">
          评论内容
        </span>
        <div className="flex items-center gap-2">
          <SearchInput
            className="min-w-0 flex-1"
            label="搜索评论内容"
            onChange={(search) =>
              setDraft((current) => ({ ...current, search }))
            }
            placeholder="搜索内容…"
            value={draft.search}
          />
          <IconButton
            aria-label="更多筛选条件"
            label="更多筛选条件"
            onPress={() => setFilterSheetOpen(true)}
            tone="quiet"
          >
            <Filter aria-hidden="true" />
          </IconButton>
        </div>
      </div>

      {selectedIds.size > 0 ? (
        <div
          className="
            mt-3 flex items-center justify-between gap-3 rounded-control border
            border-accent-rule bg-accent-wash px-3 py-2
          "
        >
          <span className="font-mono text-xs text-accent-text">
            已选 {selectedIds.size} 条评论
          </span>
          <div className="flex gap-2">
            <Button
              onPress={() => setSelectedIds(new Set())}
              size="sm"
              tone="ghost"
            >
              取消选择
            </Button>
            <Button onPress={() => setBatchOpen(true)} size="sm" tone="warnish">
              删除所选
            </Button>
          </div>
        </div>
      ) : null}

      <section aria-busy={loading} className="mt-5">
        {loading ? (
          <RowSkeleton rows={6} />
        ) : error ? (
          <EmptyState
            action={<Button onPress={reload}>重试</Button>}
            icon={<CloudOff aria-hidden="true" />}
            title="没能连上评论"
          >
            {error}
          </EmptyState>
        ) : data && data.items.length === 0 ? (
          <EmptyState
            action={
              hasFilter ? (
                <Button
                  onPress={() => {
                    setDraft(EMPTY_FILTER);
                    setPage(1);
                  }}
                >
                  清除筛选
                </Button>
              ) : undefined
            }
            icon={<MessagesSquare aria-hidden="true" />}
            title={hasFilter ? '没有符合这组筛选的评论' : '还没有评论'}
          >
            {hasFilter
              ? '换一组条件，或者清除筛选看看全部。'
              : '访客在文章或动态下发布评论后会显示在这里。'}
          </EmptyState>
        ) : (
          <div className="grid gap-3">
            {data?.items.map((comment) => (
              <CommentCard
                actions={{
                  onDelete: (target) =>
                    setDeleteTarget({
                      childrenCount:
                        target.id === comment.id ? comment.childrenCount : 0,
                      comment: target,
                    }),
                  onOpenSession: () => setSession(comment),
                  onReply: (target) => setReplyTarget(toReplyTarget(target)),
                }}
                comment={comment}
                key={comment.id}
                onToggleSelect={() => toggleSelect(comment.id)}
                selected={selectedIds.has(comment.id)}
              />
            ))}
          </div>
        )}
      </section>

      {data && data.total > PAGE_SIZE ? (
        <nav
          aria-label="分页"
          className="mt-5 flex items-center justify-between gap-3"
        >
          <span className="font-mono text-xs text-ink-dim">
            共 {data.total} 条 · 第 {page} / {totalPages} 页
          </span>
          <div className="flex gap-2">
            <Button
              isDisabled={page <= 1}
              onPress={() => setPage((current) => Math.max(1, current - 1))}
              size="sm"
            >
              上一页
            </Button>
            <Button
              isDisabled={page >= totalPages}
              onPress={() => setPage((current) => current + 1)}
              size="sm"
            >
              下一页
            </Button>
          </div>
        </nav>
      ) : null}

      <BottomSheet
        isOpen={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        title="筛选评论"
      >
        <div className="grid gap-4 px-4 pt-1 pb-4">
          <FilterControls onChange={setDraft} value={draft} />
          <Button onPress={() => setFilterSheetOpen(false)} tone="solid">
            完成
          </Button>
        </div>
      </BottomSheet>

      <SessionDialog
        comment={session}
        onChanged={reload}
        onClose={() => setSession(null)}
        onDelete={(target) =>
          setDeleteTarget({
            childrenCount:
              target.id === session?.id ? session.childrenCount : 0,
            comment: target,
          })
        }
        onReply={(target) => setReplyTarget(toReplyTarget(target))}
      />

      <ReplyDialog
        onClose={() => setReplyTarget(null)}
        onReplied={reload}
        open={replyTarget !== null}
        target={replyTarget}
      />

      <ConfirmDialog
        confirmLabel="删除评论"
        isDestructive
        isOpen={deleteTarget !== null}
        message={
          deleteTarget
            ? `将删除该评论${
                deleteTarget.childrenCount > 0
                  ? `及其 ${deleteTarget.childrenCount} 条回复`
                  : ''
              }（作者：${deleteTarget.comment.author.username}），不可恢复。`
            : ''
        }
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void removeSingle()}
        title={
          deleteTarget ? `删除评论 #${String(deleteTarget.comment.id)}？` : ''
        }
      />

      <ConfirmDialog
        confirmLabel="删除所选"
        isDestructive
        isOpen={batchOpen}
        message={`将删除所选的 ${selectedIds.size} 条评论及其全部回复，不可恢复。`}
        onCancel={() => setBatchOpen(false)}
        onConfirm={() => void removeBatch()}
        title="批量删除评论？"
      />
    </PageBody>
  );
};
