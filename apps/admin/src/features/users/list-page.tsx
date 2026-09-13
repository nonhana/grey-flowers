import type {
  UserAdminSummary,
  UserListQuery,
  UserRole,
} from '@grey-flowers/contracts';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useSearch } from '@tanstack/react-router';
import { cn } from 'cn';
import { CloudOff, RotateCcw, Users } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { apiClient } from '@/app/api/index';
import {
  invalidateUsersAfterMutation,
  usersListOptions,
} from '@/app/server-state/modules/users';
import { useDebouncedCommit } from '@/hooks/use-debounced-commit';
import { useDialog } from '@/hooks/use-dialog';
import { usePageClamp } from '@/hooks/use-page-clamp';
import { useScrollReset } from '@/hooks/use-scroll-reset';
import { useSearchNavigation } from '@/hooks/use-search-navigation';
import { toastError } from '@/lib/toast';
import { Button } from '@/ui/button';
import { EmptyState } from '@/ui/feedback';
import { SearchInput, SelectField } from '@/ui/form';
import { Paginator } from '@/ui/paginator';
import { MetaLine, PageBody, PageHeader } from '@/ui/surface';

import { UserDeleteConfirm } from './delete-confirm';
import { UserDetailDialog } from './detail-dialog';
import { EditUserDialog } from './edit-dialog';
import { UserCard, UserCardSkeleton } from './user-card';

const PAGE_SIZE = 20;

const ROLE_OPTIONS = ['USER', 'ADMIN'] as const;
const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: '管理员',
  USER: '用户',
};

interface UserFilterDraft {
  role: UserRole | '';
  search: string;
}

const EMPTY_FILTER: UserFilterDraft = { role: '', search: '' };

export const UsersPage = () => {
  const search = useSearch({ from: '/users' });
  const role = search.role;
  const searchValue = search.search;
  const page = search.page ?? 1;
  const listRef = useRef<HTMLElement>(null);
  useScrollReset(listRef, [page, role, searchValue]);

  const detailDialog = useDialog<UserAdminSummary>();
  const editDialog = useDialog<UserAdminSummary>();
  const deleteDialog = useDialog<UserAdminSummary>();

  const navigateSearch = useSearchNavigation('/users', search);

  const [draft, setDraft] = useState<UserFilterDraft>(() => ({
    role: role ?? '',
    search: searchValue ?? '',
  }));

  const commitFilters = useDebouncedCommit((value: UserFilterDraft) => {
    navigateSearch(
      {
        page: undefined,
        role: value.role === '' ? undefined : value.role,
        search: value.search.trim() || undefined,
      },
      true,
    );
  }, 300);

  const listQuery: UserListQuery = {
    page,
    pageSize: PAGE_SIZE,
    ...(searchValue ? { search: searchValue } : {}),
    ...(role ? { role } : {}),
  };
  const usersQuery = useQuery(usersListOptions(listQuery));
  const data = usersQuery.data;
  const loading = usersQuery.isPending;
  const busy = usersQuery.isFetching;
  const placeholder = usersQuery.isPlaceholderData;
  const error = usersQuery.error ? '无法加载用户，请稍后重试。' : '';

  const { clamping, totalPages } = usePageClamp({
    emptyPage: data !== undefined && data.items.length === 0,
    page,
    pageSize: PAGE_SIZE,
    setPage: (next) => navigateSearch({ page: next }, true),
    total: data?.total ?? 0,
  });
  const hasFilter = searchValue !== undefined || role !== undefined;

  const removeMutation = useMutation({
    mutationFn: (target: UserAdminSummary) => apiClient.users.remove(target.id),
    onSuccess: async (result, target) => {
      const cascadeNote =
        result.cascade > 0 ? `（含 ${result.cascade} 条其他用户的回复）` : '';
      toast.success(
        `已删除用户「${target.username}」及 ${result.deleted} 条评论${cascadeNote}。`,
      );
      await invalidateUsersAfterMutation();
    },
    onError: (cause) => {
      // CONFLICT（删管理员 / 有资产快照）的消息由服务端中文 message 透出
      toastError(cause);
    },
  });

  const removeUser = () => {
    const target = deleteDialog.data;
    if (!target) return;
    deleteDialog.dismiss();
    if (detailDialog.data?.id === target.id) detailDialog.dismiss();
    if (editDialog.data?.id === target.id) editDialog.dismiss();
    removeMutation.mutate(target);
  };

  return (
    <PageBody scroll="child" width="wide">
      <PageHeader
        actions={
          <MetaLine>
            {data ? <span>共 {data.total} 位用户</span> : null}
          </MetaLine>
        }
        description="检索与维护注册用户；编辑或删除前请确认角色与会话影响。"
        title="用户"
      />

      <section
        aria-label="筛选用户"
        className="
          grid grid-cols-1 gap-3
          md:grid-cols-[minmax(14rem,1fr)_10rem_auto]
        "
      >
        <div className="grid min-w-0 gap-1.5">
          <span className="font-mono text-xs text-ink-dim">用户名 / 邮箱</span>
          <SearchInput
            className="min-w-0"
            label="搜索用户名或邮箱"
            onChange={(value) => {
              const next = { ...draft, search: value };
              setDraft(next);
              commitFilters(next);
            }}
            placeholder="搜索用户名或邮箱…"
            value={draft.search}
          />
        </div>
        <SelectField
          label="角色"
          onChange={(value) => {
            const next: UserFilterDraft = { ...draft, role: value ?? '' };
            setDraft(next);
            commitFilters(next);
          }}
          optionLabels={ROLE_LABELS}
          options={ROLE_OPTIONS}
          value={draft.role === '' ? undefined : draft.role}
        />
        {hasFilter ? (
          <Button
            className="self-end justify-self-start"
            icon={<RotateCcw aria-hidden />}
            onPress={() => {
              setDraft(EMPTY_FILTER);
              commitFilters.cancel();
              navigateSearch(
                { page: undefined, role: undefined, search: undefined },
                true,
              );
            }}
            size="md"
            tone="ghost"
          >
            重置
          </Button>
        ) : null}
      </section>

      <section
        aria-busy={busy}
        inert={placeholder}
        ref={listRef}
        className={cn(
          `
            mt-5 min-h-0 flex-1 overflow-y-auto overscroll-contain
            transition-opacity
          `,
          placeholder && 'opacity-60',
        )}
      >
        {loading || clamping ? (
          <div className="grid animate-content-in gap-3" key="skeleton">
            {Array.from({ length: PAGE_SIZE }, (_, index) => (
              <UserCardSkeleton key={index} />
            ))}
          </div>
        ) : error ? (
          <EmptyState
            action={
              <Button onPress={() => void usersQuery.refetch()}>重试</Button>
            }
            icon={<CloudOff aria-hidden />}
            title="没能连上用户"
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
                    commitFilters.cancel();
                    navigateSearch(
                      { page: undefined, role: undefined, search: undefined },
                      true,
                    );
                  }}
                >
                  清除筛选
                </Button>
              ) : undefined
            }
            icon={<Users aria-hidden />}
            title={hasFilter ? '没有符合这组筛选的用户' : '还没有注册用户'}
          >
            {hasFilter
              ? '换一组条件，或者清除筛选看看全部。'
              : '注册用户会在这里显示。'}
          </EmptyState>
        ) : (
          <div className="grid animate-content-in gap-3" key="content">
            {data?.items.map((user) => (
              <UserCard
                actions={{
                  onDelete: () => deleteDialog.open(user),
                  onDetail: () => detailDialog.open(user),
                  onEdit: () => editDialog.open(user),
                }}
                key={user.id}
                user={user}
              />
            ))}
          </div>
        )}
      </section>

      {data && !clamping ? (
        <Paginator
          className="mt-5"
          isBusy={placeholder}
          onChange={(next) =>
            navigateSearch({ page: next > 1 ? next : undefined })
          }
          page={page}
          total={data.total}
          totalPages={totalPages}
          unit="位"
        />
      ) : null}

      <UserDetailDialog
        onClose={detailDialog.dismiss}
        onExited={detailDialog.clear}
        open={detailDialog.isOpen}
        session={detailDialog.session}
        user={detailDialog.data}
      />

      <EditUserDialog
        onClose={editDialog.dismiss}
        onExited={editDialog.clear}
        open={editDialog.isOpen}
        session={editDialog.session}
        user={editDialog.data}
      />
      <UserDeleteConfirm
        isOpen={deleteDialog.isOpen}
        onCancel={deleteDialog.dismiss}
        onConfirm={() => void removeUser()}
        onExited={deleteDialog.clear}
        user={deleteDialog.data}
      />
    </PageBody>
  );
};
