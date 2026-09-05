import type { UserAdminSummary, UserRole } from '@grey-flowers/contracts';

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Form } from 'react-aria-components';
import { toast } from 'sonner';

import { apiClient } from '@/app/api/index';
import { invalidateUsersAfterMutation } from '@/app/server-state/users';
import { toastError } from '@/lib/toast';
import { Button } from '@/ui/button';
import { Alert } from '@/ui/feedback';
import { SelectField, TextField } from '@/ui/form';
import { AppDialog } from '@/ui/overlay';

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

/** 编辑会话本体：draft 与保存逻辑全部住在会话内，随 session 卸载消失。 */
const EditUserBody = ({
  onClose,
  user,
}: {
  onClose: () => void;
  user: UserAdminSummary;
}) => {
  const [draft, setDraft] = useState<EditDraft>({
    email: user.email,
    role: user.role,
    site: user.site ?? '',
    username: user.username,
  });

  const roleChanged = draft.role !== user.role;

  const saveMutation = useMutation({
    mutationFn: (input: {
      email?: string;
      role?: UserRole;
      site: string | null;
      username?: string;
    }) => apiClient.users.update(user.id, input),
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
      setDraft((current) => ({ ...current, [key]: value }));
    };
  };

  const submit = () => {
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
    <Form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <EditFields draft={draft} roleChanged={roleChanged} setField={setField} />
      <Button
        isLoading={saveMutation.isPending}
        size="sm"
        tone="solid"
        type="submit"
      >
        保存
      </Button>
    </Form>
  );
};

/**
 * 编辑用户资料。avatar 不可管理端编辑（服务端由邮箱派生）；密码属自助；
 * role 变更会撤销该用户全部会话，需重新登录——选择与当前不同时给出提示。
 * 草稿住在 session-keyed 的编辑会话组件里（M4）：每次打开都从 user 当前值
 * 起一份全新草稿，同一用户重开也拿到全新表单。
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
  /** useDialog 的单调会话 id：作为编辑会话组件的 key，每次打开重建会话。 */
  session: number;
  user: UserAdminSummary | null;
}) => {
  return (
    <AppDialog
      isOpen={open}
      onExited={onExited}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      size="md"
      title="编辑用户"
    >
      {user ? (
        <EditUserBody key={session} onClose={onClose} user={user} />
      ) : null}
    </AppDialog>
  );
};
