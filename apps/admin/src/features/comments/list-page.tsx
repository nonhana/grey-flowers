import type {
  CommentAdmin,
  CommentAdminTree,
  CommentListQuery,
} from '@grey-flowers/contracts';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useSearch } from '@tanstack/react-router';
import { CloudOff, Filter, MessagesSquare } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { apiClient } from '@/app/api/index';
import {
  commentsListOptions,
  invalidateCommentsAfterMutation,
} from '@/app/server-state/modules/comments';
import { useDebouncedCommit } from '@/hooks/use-debounced-commit';
import { useDialog } from '@/hooks/use-dialog';
import { usePageClamp } from '@/hooks/use-page-clamp';
import { useSearchNavigation } from '@/hooks/use-search-navigation';
import { toastError } from '@/lib/toast';
import { Button, IconButton } from '@/ui/button';
import { EmptyState } from '@/ui/feedback';
import { SearchInput } from '@/ui/form';
import { BottomSheet, ConfirmDialog } from '@/ui/overlay';
import { Paginator } from '@/ui/paginator';
import { MetaLine, PageBody, PageHeader } from '@/ui/surface';

import { CommentCard, CommentCardSkeleton } from './comment-card';
import {
  EMPTY_FILTER,
  FilterControls,
  commentsFilterToSearch,
  type CommentFilterDraft,
} from './filter-controls';
import { ReplyDialog, type ReplyTarget } from './reply-dialog';
import { SessionDialog } from './session-dialog';
const PAGE_SIZE = 20;

const desktopFilterControlsClass = 'mt-5 hidden md:block';
const mobileFilterControlsClass = 'mt-5 md:hidden';

const toReplyTarget = (comment: CommentAdmin): ReplyTarget => ({
  content: comment.content,
  id: comment.id,
  username: comment.author.username,
});

export const CommentsPage = () => {
  const search = useSearch({ from: '/comments' });
  const page = search.page ?? 1;

  const navigateSearch = useSearchNavigation('/comments', search);

  const [draft, setDraft] = useState<CommentFilterDraft>(() => ({
    authorId: search.authorId === undefined ? '' : String(search.authorId),
    endDate: search.endDate ?? '',
    path: search.path ?? '',
    search: search.search ?? '',
    startDate: search.startDate ?? '',
  }));
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const sessionDialog = useDialog<CommentAdminTree>();
  const replyDialog = useDialog<ReplyTarget>();
  const deleteDialog = useDialog<{
    childrenCount: number;
    comment: CommentAdmin;
  }>();
  const batchDialog = useDialog<number[]>();

  const commitFilters = useDebouncedCommit((next: CommentFilterDraft) => {
    navigateSearch(commentsFilterToSearch(next), true);
  }, 300);

  const handleFilterChange = (next: CommentFilterDraft) => {
    setDraft(next);
    commitFilters(next);
  };

  // 筛选提交即清空选择集：跨筛选的选择没有意义还会误删
  const filterKey = [
    search.authorId ?? '',
    search.endDate ?? '',
    search.path ?? '',
    search.search ?? '',
    search.startDate ?? '',
  ].join('|');
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setSelectedIds(new Set());
  }
  const [prevPage, setPrevPage] = useState(page);
  if (prevPage !== page) {
    setPrevPage(page);
    // 翻页同样清空选择集
    setSelectedIds(new Set());
  }

  const listQuery: CommentListQuery = {
    page,
    pageSize: PAGE_SIZE,
    ...(search.search ? { search: search.search } : {}),
    ...(search.path ? { path: search.path } : {}),
    ...(search.authorId !== undefined ? { authorId: search.authorId } : {}),
    ...(search.startDate ? { startDate: search.startDate } : {}),
    ...(search.endDate ? { endDate: search.endDate } : {}),
  };
  const commentsQuery = useQuery(commentsListOptions(listQuery));
  const data = commentsQuery.data;
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const { clamping, totalPages } = usePageClamp({
    emptyPage: items.length === 0,
    page,
    pageSize: PAGE_SIZE,
    setPage: (next) => navigateSearch({ page: next }, true),
    total,
  });

  const loading = commentsQuery.isPending;
  const busy = commentsQuery.isFetching;
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
      // 批删成功后才清空选择集：mutation 失败时选择保留可重试
      setSelectedIds(new Set());
      await invalidateCommentsAfterMutation();
    },
    onError: (cause) => {
      toastError(cause);
    },
  });

  const hasFilter =
    search.search !== undefined ||
    search.path !== undefined ||
    search.authorId !== undefined ||
    search.startDate !== undefined ||
    search.endDate !== undefined;

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
    // 不在此处清空选择集：清空移入 removeBatchMutation.onSuccess
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
        <FilterControls onChange={handleFilterChange} value={draft} />
      </div>
      <div className={mobileFilterControlsClass}>
        <span className="mb-1.5 block font-mono text-xs text-ink-dim">
          评论内容
        </span>
        <div className="flex items-center gap-2">
          <SearchInput
            className="min-w-0 flex-1"
            label="搜索评论内容"
            onChange={(value) =>
              handleFilterChange({ ...draft, search: value })
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
        aria-busy={busy}
        className="mt-5 min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        {loading || clamping ? (
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
                    navigateSearch(
                      {
                        authorId: undefined,
                        endDate: undefined,
                        page: undefined,
                        path: undefined,
                        search: undefined,
                        startDate: undefined,
                      },
                      true,
                    );
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
          onChange={(next) =>
            navigateSearch({ page: next > 1 ? next : undefined })
          }
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
          <FilterControls onChange={handleFilterChange} value={draft} />
          <Button onPress={() => setFilterSheetOpen(false)} tone="solid">
            完成
          </Button>
        </div>
      </BottomSheet>

      <SessionDialog
        comment={sessionDialog.data}
        onClose={sessionDialog.dismiss}
        open={sessionDialog.isOpen}
        session={sessionDialog.session}
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
