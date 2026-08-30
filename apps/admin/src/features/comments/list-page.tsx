import type {
  CommentAdmin,
  CommentAdminTree,
  CommentListQuery,
} from '@grey-flowers/contracts';

import { parseDate } from '@internationalized/date';
import { useMutation, useQuery } from '@tanstack/react-query';
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
import { useState } from 'react';
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
import {
  commentsListOptions,
  invalidateCommentsAfterMutation,
} from '@/app/server-state/comments.js';
import { useDebouncedCommit } from '@/hooks/use-debounced-commit.js';
import { useDialog } from '@/hooks/use-dialog.js';
import { toastError } from '@/lib/toast.js';
import { Button, IconButton } from '@/ui/button.js';
import { EmptyState } from '@/ui/feedback.js';
import { SearchInput, TextField, controlClass } from '@/ui/form.js';
import { BottomSheet, ConfirmDialog } from '@/ui/overlay.js';
import { Paginator } from '@/ui/paginator.js';
import { MetaLine, PageBody, PageHeader } from '@/ui/surface.js';

import { CommentCard, CommentCardSkeleton } from './comment-card.js';
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
        <CalendarDays aria-hidden className="size-4" />
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
            <ChevronLeft aria-hidden className="size-4" />
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
            <ChevronRight aria-hidden className="size-4" />
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
          <span aria-hidden className="shrink-0 text-xs text-ink-dim">
            从
          </span>
          <CommentDatePicker
            label="开始日期"
            onChange={set('startDate')}
            value={value.startDate}
          />
          <span aria-hidden className="shrink-0 text-xs text-ink-dim">
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
          icon={<RotateCcw aria-hidden />}
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
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const sessionDialog = useDialog<CommentAdminTree>();
  const replyDialog = useDialog<ReplyTarget>();
  const deleteDialog = useDialog<{
    childrenCount: number;
    comment: CommentAdmin;
  }>();
  const batchDialog = useDialog<number[]>();

  // 筛选草稿 300ms 防抖提交；提交值一变，页码在渲染期回到第 1 页。
  const filters = useDebouncedCommit(draft, 300);
  const [prevFilters, setPrevFilters] = useState(filters);
  if (prevFilters !== filters) {
    setPrevFilters(filters);
    setPage(1);
  }

  const authorId = Number.parseInt(filters.authorId, 10);
  const listQuery: CommentListQuery = {
    page,
    pageSize: PAGE_SIZE,
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.path ? { path: filters.path } : {}),
    ...(Number.isInteger(authorId) && authorId > 0 ? { authorId } : {}),
    ...(filters.startDate ? { startDate: filters.startDate } : {}),
    ...(filters.endDate ? { endDate: filters.endDate } : {}),
  };
  const commentsQuery = useQuery(commentsListOptions(listQuery));
  const data = commentsQuery.data;
  const loading = commentsQuery.isFetching;
  const error = commentsQuery.error ? '无法加载评论，请稍后重试。' : '';

  const removeMutation = useMutation({
    mutationFn: (id: number) => apiClient.comments.remove(id),
    onSuccess: async (result) => {
      toast.success(
        `已删除 ${result.deleted} 条评论${
          result.cascade > 0 ? `（含 ${result.cascade} 条回复）` : ''
        }。`,
      );
      await invalidateCommentsAfterMutation();
    },
    onError: (cause) => {
      toastError(cause);
    },
  });

  const removeBatchMutation = useMutation({
    mutationFn: (ids: number[]) => apiClient.comments.removeBatch(ids),
    onSuccess: async (result) => {
      toast.success(`已删除 ${result.deleted} 条评论。`);
      await invalidateCommentsAfterMutation();
    },
    onError: (cause) => {
      toastError(cause);
    },
  });

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

  const removeSingle = () => {
    const target = deleteDialog.data;
    if (!target) return;
    const { comment } = target;
    deleteDialog.dismiss();
    if (sessionDialog.data?.id === comment.id) sessionDialog.dismiss();
    removeMutation.mutate(comment.id);
  };

  const removeBatch = () => {
    const ids = batchDialog.data;
    if (!ids || ids.length === 0) return;
    batchDialog.dismiss();
    setSelectedIds(new Set());
    removeBatchMutation.mutate(ids);
  };

  return (
    <PageBody scroll="child" width="wide">
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
            <Filter aria-hidden />
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
            <Button
              onPress={() => batchDialog.open([...selectedIds])}
              size="sm"
              tone="warnish"
            >
              删除所选
            </Button>
          </div>
        </div>
      ) : null}

      <section
        aria-busy={loading}
        className="mt-5 min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        {loading ? (
          <div className="grid animate-content-in gap-3" key="skeleton">
            {Array.from({ length: PAGE_SIZE }, (_, index) => (
              <CommentCardSkeleton key={index} />
            ))}
          </div>
        ) : error ? (
          <EmptyState
            action={
              <Button onPress={() => void commentsQuery.refetch()}>重试</Button>
            }
            icon={<CloudOff aria-hidden />}
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
            icon={<MessagesSquare aria-hidden />}
            title={hasFilter ? '没有符合这组筛选的评论' : '还没有评论'}
          >
            {hasFilter
              ? '换一组条件，或者清除筛选看看全部。'
              : '访客在文章或动态下发布评论后会显示在这里。'}
          </EmptyState>
        ) : (
          <div className="grid animate-content-in gap-3" key="content">
            {data?.items.map((comment) => (
              <CommentCard
                actions={{
                  onDelete: (target) =>
                    deleteDialog.open({
                      childrenCount:
                        target.id === comment.id ? comment.childrenCount : 0,
                      comment: target,
                    }),
                  onOpenSession: () => sessionDialog.open(comment),
                  onReply: (target) => replyDialog.open(toReplyTarget(target)),
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

      {data ? (
        <Paginator
          className="mt-5"
          onChange={setPage}
          page={page}
          total={data.total}
          totalPages={totalPages}
          unit="条"
        />
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
        comment={sessionDialog.data}
        onClose={sessionDialog.dismiss}
        open={sessionDialog.isOpen}
        onDelete={(target) =>
          deleteDialog.open({
            childrenCount:
              target.id === sessionDialog.data?.id
                ? (sessionDialog.data?.childrenCount ?? 0)
                : 0,
            comment: target,
          })
        }
        onExited={sessionDialog.clear}
        onReply={(target) => replyDialog.open(toReplyTarget(target))}
      />

      <ReplyDialog
        onClose={replyDialog.dismiss}
        onExited={replyDialog.clear}
        open={replyDialog.isOpen}
        session={replyDialog.session}
        target={replyDialog.data}
      />

      <ConfirmDialog
        confirmLabel="删除评论"
        isDestructive
        isOpen={deleteDialog.isOpen}
        message={
          deleteDialog.data
            ? `将删除该评论${
                deleteDialog.data.childrenCount > 0
                  ? `及其 ${deleteDialog.data.childrenCount} 条回复`
                  : ''
              }（作者：${deleteDialog.data.comment.author.username}），不可恢复。`
            : ''
        }
        onCancel={deleteDialog.dismiss}
        onConfirm={() => void removeSingle()}
        onExited={deleteDialog.clear}
        title={
          deleteDialog.data
            ? `删除评论 #${String(deleteDialog.data.comment.id)}？`
            : ''
        }
      />

      <ConfirmDialog
        confirmLabel="删除所选"
        isDestructive
        isOpen={batchDialog.isOpen}
        message={
          batchDialog.data
            ? `将删除所选的 ${batchDialog.data.length} 条评论及其全部回复，不可恢复。`
            : ''
        }
        onCancel={batchDialog.dismiss}
        onConfirm={() => void removeBatch()}
        onExited={batchDialog.clear}
        title="批量删除评论？"
      />
    </PageBody>
  );
};
