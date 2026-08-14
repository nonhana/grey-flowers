import type {
  UserAdminListData,
  UserAdminSummary,
  UserRole,
} from '@grey-flowers/contracts';

import { CloudOff, RotateCcw, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { apiClient } from '@/app/api/index.js';
import { useDerivedReset } from '@/hooks/use-derived-reset.js';
import { useDialog } from '@/hooks/use-dialog.js';
import { toastError } from '@/lib/toast.js';
import { Button } from '@/ui/button.js';
import { EmptyState } from '@/ui/feedback.js';
import { SearchInput, SelectField } from '@/ui/form.js';
import { Paginator } from '@/ui/paginator.js';
import { MetaLine, PageBody, PageHeader } from '@/ui/surface.js';

import { UserDeleteConfirm } from './delete-confirm.js';
import { UserDetailDialog } from './detail-dialog.js';
import { EditUserDialog } from './edit-dialog.js';
import { UserCard, UserCardSkeleton } from './user-card.js';

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
  const [draft, setDraft] = useState<UserFilterDraft>(EMPTY_FILTER);
  const [filters, setFilters] = useState<UserFilterDraft>(EMPTY_FILTER);
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [data, setData] = useState<UserAdminListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const detailDialog = useDialog<UserAdminSummary>();
  const editDialog = useDialog<UserAdminSummary>();
  const deleteDialog = useDialog<UserAdminSummary>();

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
  useDerivedReset(requestKey, () => {
    setLoading(true);
    setError('');
  });

  useEffect(() => {
    let cancelled = false;

    apiClient.users
      .list({
        page,
        pageSize: PAGE_SIZE,
        ...(filters.search ? { search: filters.search } : {}),
        ...(filters.role ? { role: filters.role } : {}),
      })
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        if (!cancelled) setError('无法加载用户，请稍后重试。');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filters, page, reloadKey]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const hasFilter = filters.search !== '' || filters.role !== '';

  const reload = () => setReloadKey((current) => current + 1);

  const removeUser = async () => {
    const target = deleteDialog.data;
    if (!target) return;
    deleteDialog.dismiss();
    if (detailDialog.data?.id === target.id) detailDialog.dismiss();
    if (editDialog.data?.id === target.id) editDialog.dismiss();
    try {
      const result = await apiClient.users.remove(target.id);
      const cascadeNote =
        result.cascade > 0 ? `（含 ${result.cascade} 条其他用户的回复）` : '';
      toast.success(
        `已删除用户「${target.username}」及 ${result.deleted} 条评论${cascadeNote}。`,
      );
      reload();
    } catch (cause) {
      // CONFLICT（删管理员 / 有资产快照）的消息由服务端中文 message 透出。
      toastError(cause);
    }
  };

  const onSaved = () => {
    reload();
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
            onChange={(search) =>
              setDraft((current) => ({ ...current, search }))
            }
            placeholder="搜索用户名或邮箱…"
            value={draft.search}
          />
        </div>
        <SelectField
          label="角色"
          onChange={(role) =>
            setDraft((current) => ({ ...current, role: role ?? '' }))
          }
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
              setPage(1);
            }}
            size="md"
            tone="ghost"
          >
            重置
          </Button>
        ) : null}
      </section>

      <section
        aria-busy={loading}
        className="mt-5 min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        {loading ? (
          <div className="grid animate-content-in gap-3" key="skeleton">
            {Array.from({ length: PAGE_SIZE }, (_, index) => (
              <UserCardSkeleton key={index} />
            ))}
          </div>
        ) : error ? (
          <EmptyState
            action={<Button onPress={reload}>重试</Button>}
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
                    setPage(1);
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

      {data ? (
        <Paginator
          className="mt-5"
          onChange={setPage}
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
        user={detailDialog.data}
      />

      <EditUserDialog
        onClose={editDialog.dismiss}
        onExited={editDialog.clear}
        onSaved={onSaved}
        open={editDialog.isOpen}
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
