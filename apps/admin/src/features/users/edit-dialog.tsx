import type { UserAdminSummary, UserRole } from '@grey-flowers/contracts';

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Form } from 'react-aria-components';
import { toast } from 'sonner';

import { apiClient } from '@/app/api/index.js';
import { invalidateUsersAfterMutation } from '@/app/server-state/users.js';
import { toastError } from '@/lib/toast.js';
import { Button } from '@/ui/button.js';
import { Alert } from '@/ui/feedback.js';
import { SelectField, TextField } from '@/ui/form.js';
import { AppDialog } from '@/ui/overlay.js';

const ROLE_OPTIONS = ['USER', 'ADMIN'] as const;

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: '管理员',
  USER: '用户',
};

interface EditDraft {
  email: string;
  role: UserRole;
  site: string;
  username: string;
}

/** 单次打开会话内的字段组：session key 重挂载即回全新受控草稿。 */
const EditFields = ({
  draft,
  roleChanged,
  setField,
}: {
  draft: EditDraft;
  roleChanged: boolean;
  setField: <K extends keyof EditDraft>(
    key: K,
  ) => (value: EditDraft[K]) => void;
}) => (
  <div className="grid gap-4">
    <TextField
      label="用户名"
      onChange={setField('username')}
      value={draft.username}
    />
    <TextField
      label="邮箱"
      onChange={setField('email')}
      type="email"
      value={draft.email}
    />
    <TextField
      description="留空将清空个人主页链接。"
      label="个人主页（可选）"
      onChange={setField('site')}
      placeholder="https://example.com"
      value={draft.site}
    />
    <SelectField
      label="角色"
      onChange={(role) => {
        if (role) setField('role')(role);
      }}
      optionLabels={ROLE_LABELS}
      options={ROLE_OPTIONS}
      placeholderLabel="不修改"
      value={draft.role}
    />
    {roleChanged ? (
      <Alert tone="warn">
        变更角色将使其全部会话立即失效，该用户需重新登录。
      </Alert>
    ) : null}
  </div>
);

/**
 * 编辑用户资料。avatar 不可管理端编辑（服务端由邮箱派生）；密码属自助；
 * role 变更会撤销该用户全部会话，需重新登录——选择与当前不同时给出提示。
 * 草稿以 useDialog 的 session 为 key 重建：同一用户重开也拿到全新表单。
 */
export const EditUserDialog = ({
  onClose,
  onExited,
  open,
  session,
  user,
}: {
  onClose: () => void;
  onExited?: () => void;
  open: boolean;
  /** useDialog 的单调会话 id：重开同一用户也重建全新草稿。 */
  session: number;
  user: UserAdminSummary | null;
}) => {
  const [draft, setDraft] = useState<EditDraft | null>(null);

  // 打开/切换用户时同步草稿（渲染期、受条件保护地调整 state）。
  const [prevUserId, setPrevUserId] = useState<number | null>(null);
  if (user && prevUserId !== user.id) {
    setPrevUserId(user.id);
    setDraft({
      email: user.email,
      role: user.role,
      site: user.site ?? '',
      username: user.username,
    });
  }

  const roleChanged =
    draft !== null && user !== null && draft.role !== user.role;

  const saveMutation = useMutation({
    mutationFn: (input: {
      email?: string;
      role?: UserRole;
      site: string | null;
      username?: string;
    }) => {
      if (!user) return Promise.reject(new Error('no user'));
      return apiClient.users.update(user.id, input);
    },
    onSuccess: async () => {
      toast.success('已保存用户资料。');
      onClose();
      await invalidateUsersAfterMutation();
    },
    onError: (error) => {
      // CONFLICT（用户名/邮箱占用）的消息由服务端中文 message 透出。
      toastError(error);
    },
  });

  const setField = <K extends keyof EditDraft>(key: K) => {
    return (value: EditDraft[K]) => {
      setDraft((current) => (current ? { ...current, [key]: value } : current));
    };
  };

  const submit = () => {
    if (!user || !draft) return;
    const username = draft.username.trim();
    const email = draft.email.trim();
    const site = draft.site.trim() === '' ? null : draft.site.trim();

    saveMutation.mutate({
      ...(username !== user.username ? { username } : {}),
      ...(email !== user.email ? { email } : {}),
      site,
      ...(draft.role !== user.role ? { role: draft.role } : {}),
    });
  };

  return (
    <AppDialog
      footer={
        user ? (
          <Form
            className="grid w-full gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <Button
              isDisabled={!draft}
              isLoading={saveMutation.isPending}
              size="sm"
              tone="solid"
              type="submit"
            >
              保存
            </Button>
          </Form>
        ) : undefined
      }
      isOpen={open}
      onExited={onExited}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      size="md"
      title="编辑用户"
    >
      {draft && user ? (
        <EditFields
          draft={draft}
          key={session}
          roleChanged={roleChanged}
          setField={setField}
        />
      ) : null}
    </AppDialog>
  );
};
