import type { UserAdminSummary } from '@grey-flowers/contracts';

import { ConfirmDialog } from '@/ui/overlay';

/** 删除用户确认：披露 authored 评论数与级联警告（子回复可能含他人回复、通知一并删除）。 */
export const UserDeleteConfirm = ({
  isOpen,
  onCancel,
  onConfirm,
  onExited,
  user,
}: {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: (user: UserAdminSummary) => void;
  onExited?: () => void;
  user: UserAdminSummary | null;
}) => (
  <ConfirmDialog
    confirmLabel="删除用户"
    isDestructive
    isOpen={isOpen}
    message={
      user
        ? `将删除用户「${user.username}」及其发布的 ${
            user.commentCount
          } 条评论；其评论下的全部子回复${
            user.commentCount > 0 ? '（可能包含其他用户的回复）' : ''
          }与相关通知将一并删除，不可恢复。`
        : ''
    }
    onCancel={onCancel}
    onConfirm={() => {
      if (user) onConfirm(user);
    }}
    onExited={onExited}
    title={user ? `删除用户「${user.username}」？` : ''}
  />
);
