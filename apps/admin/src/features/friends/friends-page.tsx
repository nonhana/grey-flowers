import type { FriendAdmin } from '@grey-flowers/contracts';

import { useMutation, useQuery } from '@tanstack/react-query';
import { BookHeart, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { apiClient } from '@/app/api/index';
import {
  friendsListOptions,
  invalidateFriendsAfterMutation,
} from '@/app/server-state/modules/friends';
import { useDialog } from '@/hooks/use-dialog';
import { toastError } from '@/lib/toast';
import { Button } from '@/ui/button';
import { EmptyState } from '@/ui/feedback';
import { ConfirmDialog } from '@/ui/overlay';
import { PageBody, PageHeader, RowStack } from '@/ui/surface';

import { FriendEditDialog } from './friend-edit-dialog';
import { FriendItem, FriendItemSkeleton } from './friend-item';

export const FriendsPage = () => {
  const friendsQuery = useQuery(friendsListOptions());
  const items = friendsQuery.data?.items ?? [];
  const loading = friendsQuery.isPending;
  const editDialog = useDialog<FriendAdmin | null>();
  const deleteDialog = useDialog<FriendAdmin>();

  const deleteMutation = useMutation({
    mutationFn: (target: FriendAdmin) => apiClient.friends.remove(target.id),
    onSuccess: async (_data, target) => {
      await invalidateFriendsAfterMutation();
      toast.success(`已删除友链「${target.site}」。`);
    },
    onError: (deleteError) => {
      toastError(deleteError);
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (ids: number[]) => apiClient.friends.reorder(ids),
    onSuccess: () => invalidateFriendsAfterMutation(),
    onError: (reorderError) => {
      toastError(reorderError);
    },
  });

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    reorderMutation.mutate(next.map((item) => item.id));
  };

  const remove = () => {
    const target = deleteDialog.data;
    if (!target) return;
    deleteDialog.dismiss();
    deleteMutation.mutate(target);
  };

  const busy = reorderMutation.isPending;

  return (
    <PageBody scroll="child" width="narrow">
      <PageHeader
        actions={
          <Button
            icon={<Plus aria-hidden />}
            onPress={() => editDialog.open(null)}
            tone="solid"
          >
            新建友链
          </Button>
        }
        description="同一 URL 只能添加一条。删除后主站不再展示该友链。"
        title="友链"
      />

      <div className="mt-5 min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {loading ? (
          <RowStack className="animate-content-in" key="skeleton">
            {Array.from({ length: 4 }, (_, index) => (
              <FriendItemSkeleton key={index} />
            ))}
          </RowStack>
        ) : items.length === 0 ? (
          <EmptyState
            action={
              <Button
                icon={<Plus aria-hidden />}
                onPress={() => editDialog.open(null)}
                tone="solid"
              >
                新建友链
              </Button>
            }
            icon={<BookHeart aria-hidden />}
            title="还没有友链"
          >
            友链会展示在主站「友情链接」区，排在前面的先展示。
          </EmptyState>
        ) : (
          <RowStack className="animate-content-in" key="content">
            {items.map((friend, index) => (
              <FriendItem
                busy={busy}
                friend={friend}
                isBottom={index === items.length - 1}
                isTop={index === 0}
                key={friend.id}
                onDelete={() => deleteDialog.open(friend)}
                onEdit={() => editDialog.open(friend)}
                onMoveDown={() => move(index, 1)}
                onMoveUp={() => move(index, -1)}
              />
            ))}
          </RowStack>
        )}
      </div>

      <FriendEditDialog
        friend={editDialog.data}
        onClose={editDialog.dismiss}
        onExited={editDialog.clear}
        open={editDialog.isOpen}
      />

      <ConfirmDialog
        confirmLabel="删除友链"
        isDestructive
        isOpen={deleteDialog.isOpen}
        message={
          deleteDialog.data
            ? `「${deleteDialog.data.site}」将从主站「友情链接」区移除。`
            : ''
        }
        onCancel={deleteDialog.dismiss}
        onConfirm={() => void remove()}
        onExited={deleteDialog.clear}
        title={
          deleteDialog.data ? `删除友链「${deleteDialog.data.site}」？` : ''
        }
      />
    </PageBody>
  );
};
