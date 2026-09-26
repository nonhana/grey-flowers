import type { WorkAdmin } from '@grey-flowers/contracts';

import { useMutation, useQuery } from '@tanstack/react-query';
import { Package, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { apiClient } from '@/app/api/index';
import {
  invalidateWorksAfterMutation,
  worksListOptions,
} from '@/app/server-state/modules/works';
import { useDialog } from '@/hooks/use-dialog';
import { toastError } from '@/lib/toast';
import { Button } from '@/ui/button';
import { EmptyState } from '@/ui/feedback';
import { ConfirmDialog } from '@/ui/overlay';
import { PageBody, PageHeader, RowStack } from '@/ui/surface';

import { WorkEditDialog } from './work-edit-dialog';
import { WorkItem, WorkItemSkeleton } from './work-item';

export const WorksPage = () => {
  const worksQuery = useQuery(worksListOptions());
  const items = worksQuery.data?.items ?? [];
  const loading = worksQuery.isPending;
  const editDialog = useDialog<WorkAdmin | null>();
  const deleteDialog = useDialog<WorkAdmin>();

  const deleteMutation = useMutation({
    mutationFn: (target: WorkAdmin) => apiClient.works.remove(target.id),
    onSuccess: async (_data, target) => {
      await invalidateWorksAfterMutation();
      toast.success(`已删除作品「${target.site}」。`);
    },
    onError: (deleteError) => {
      toastError(deleteError);
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (ids: number[]) => apiClient.works.reorder(ids),
    onSuccess: () => invalidateWorksAfterMutation(),
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
            新建作品
          </Button>
        }
        description="同一 URL 只能添加一条。删除后主站不再展示该作品。"
        title="作品"
      />

      <div className="mt-5 min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {loading ? (
          <RowStack className="animate-content-in" key="skeleton">
            {Array.from({ length: 4 }, (_, index) => (
              <WorkItemSkeleton key={index} />
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
                新建作品
              </Button>
            }
            icon={<Package aria-hidden />}
            title="还没有作品"
          >
            作品会展示在主站「自己写的一些作品」区，排在前面的先展示。
          </EmptyState>
        ) : (
          <RowStack className="animate-content-in" key="content">
            {items.map((work, index) => (
              <WorkItem
                busy={busy}
                isBottom={index === items.length - 1}
                isTop={index === 0}
                key={work.id}
                onDelete={() => deleteDialog.open(work)}
                onEdit={() => editDialog.open(work)}
                onMoveDown={() => move(index, 1)}
                onMoveUp={() => move(index, -1)}
                work={work}
              />
            ))}
          </RowStack>
        )}
      </div>

      <WorkEditDialog
        onClose={editDialog.dismiss}
        onExited={editDialog.clear}
        open={editDialog.isOpen}
        work={editDialog.data}
      />

      <ConfirmDialog
        confirmLabel="删除作品"
        isDestructive
        isOpen={deleteDialog.isOpen}
        message={
          deleteDialog.data
            ? `「${deleteDialog.data.site}」将从主站「自己写的一些作品」区移除。`
            : ''
        }
        onCancel={deleteDialog.dismiss}
        onConfirm={() => void remove()}
        onExited={deleteDialog.clear}
        title={
          deleteDialog.data ? `删除作品「${deleteDialog.data.site}」？` : ''
        }
      />
    </PageBody>
  );
};
