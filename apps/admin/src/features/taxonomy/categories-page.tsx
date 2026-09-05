import type {
  AssetDto,
  CategoryAdmin,
  CategorySaveInput,
} from '@grey-flowers/contracts';

import { useMutation, useQuery } from '@tanstack/react-query';
import { cn } from 'cn';
import { FolderTree, ImagePlus, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { apiClient, isApiRequestError } from '@/app/api/index';
import {
  invalidateTaxonomyAfterMutation,
  taxonomyCategoriesOptions,
} from '@/app/server-state/taxonomy';
import { AssetPickerDialog } from '@/features/assets/asset-picker';
import { useDialog } from '@/hooks/use-dialog';
import { toastError } from '@/lib/toast';
import { Button, IconButton } from '@/ui/button';
import { Alert, EmptyState, Skeleton } from '@/ui/feedback';
import { controlClass, FieldLabel, TextField } from '@/ui/form';
import { AssetImage } from '@/ui/image';
import { AppDialog, ConfirmDialog } from '@/ui/overlay';
import { PageBody, PageHeader, RowStack } from '@/ui/surface';

/** 与真实分类行同构：封面位 48px 主导行高 + 名称/计数 + 编辑删除位。 */
const CategoryRowSkeleton = () => (
  <div aria-hidden className="flex items-center gap-4 px-4 py-3">
    <Skeleton className="size-12 shrink-0 rounded-control" />
    <div className="min-w-0 flex-1">
      <Skeleton className="h-[1.6em] w-40 text-md" />
      <Skeleton className="h-[1.45em] w-20 text-2xs" />
    </div>
    <div className="flex shrink-0 gap-1.5">
      <Skeleton className="size-8 rounded-control" />
      <Skeleton className="size-8 rounded-control" />
    </div>
  </div>
);

interface CategoryForm {
  cover: string;
  coverAssetId: number | null;
  name: string;
}

const EMPTY_FORM: CategoryForm = { cover: '', coverAssetId: null, name: '' };

export const CategoriesPage = () => {
  const categoriesQuery = useQuery(taxonomyCategoriesOptions());
  const items = categoriesQuery.data?.items ?? [];
  const loading = categoriesQuery.isFetching;
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<CategoryAdmin | null>(null);
  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const deleteDialog = useDialog<CategoryAdmin>();

  const saveMutation = useMutation({
    mutationFn: ({
      target,
      input,
    }: {
      target: CategoryAdmin | null;
      input: CategorySaveInput;
    }) =>
      target
        ? apiClient.taxonomy.updateCategory(target.id, input)
        : apiClient.taxonomy.createCategory(input),
    onSuccess: async (_data, { target }) => {
      setDialogOpen(false);
      await invalidateTaxonomyAfterMutation();
      toast.success(target ? '已保存修改。' : '分类已创建。');
    },
    onError: (saveError, { input }) => {
      setError(
        isApiRequestError(saveError, 'CONFLICT')
          ? `已经有一个叫「${input.name}」的分类了。`
          : isApiRequestError(saveError)
            ? saveError.message
            : '保存失败，请重试。',
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (target: CategoryAdmin) =>
      apiClient.taxonomy.deleteCategory(target.id),
    onSuccess: async (_data, target) => {
      await invalidateTaxonomyAfterMutation();
      toast.success(`已删除分类「${target.name}」。`);
    },
    onError: (deleteError, target) => {
      toastError(deleteError, {
        CONFLICT: `分类「${target.name}」下还有文章，先把它们移到别处再删。`,
      });
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError(null);
    setDialogOpen(true);
  };

  const openEdit = (category: CategoryAdmin) => {
    setEditing(category);
    setForm({
      cover: category.cover,
      coverAssetId: category.coverAssetId,
      name: category.name,
    });
    setError(null);
    setDialogOpen(true);
  };

  const save = () => {
    const name = form.name.trim();
    if (!name) {
      setError('分类名不能为空。');
      return;
    }
    setError(null);
    saveMutation.mutate({
      target: editing,
      input: { cover: form.cover, coverAssetId: form.coverAssetId, name },
    });
  };

  const remove = () => {
    const target = deleteDialog.data;
    if (!target) return;
    deleteDialog.dismiss();
    deleteMutation.mutate(target);
  };

  return (
    <PageBody scroll="child" width="narrow">
      <PageHeader
        actions={
          <Button icon={<Plus aria-hidden />} onPress={openCreate} tone="solid">
            新建分类
          </Button>
        }
        description="一篇文章只属于一个分类。分类下还有文章时不能删除。"
        title="分类"
      />

      <div className="mt-5 min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {loading ? (
          <RowStack className="animate-content-in" key="skeleton">
            {Array.from({ length: 3 }, (_, index) => (
              <CategoryRowSkeleton key={index} />
            ))}
          </RowStack>
        ) : items.length === 0 ? (
          <EmptyState
            action={
              <Button
                icon={<Plus aria-hidden />}
                onPress={openCreate}
                tone="solid"
              >
                新建分类
              </Button>
            }
            icon={<FolderTree aria-hidden />}
            title="还没有分类"
          >
            分类是文章的主干目录，会显示在主站的导航里。没有分类的文章会归入「未分类」。
          </EmptyState>
        ) : (
          <RowStack className="animate-content-in" key="content">
            {items.map((category) => (
              <div
                className="flex items-center gap-4 px-4 py-3"
                key={category.id}
              >
                <div
                  className="
                    grid size-12 shrink-0 place-items-center overflow-hidden
                    rounded-control bg-well
                  "
                >
                  {category.cover ? (
                    <AssetImage
                      alt=""
                      className="size-full object-cover"
                      src={category.cover}
                    />
                  ) : (
                    <ImagePlus aria-hidden className="size-4 text-ink-dim" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-md text-ink-strong">
                    {category.name}
                  </p>
                  <p className="font-mono text-2xs text-ink-dim">
                    {category.articleCount} 篇文章
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <IconButton
                    label={`编辑分类 ${category.name}`}
                    onPress={() => openEdit(category)}
                    size="sm"
                    tone="quiet"
                  >
                    <Pencil aria-hidden />
                  </IconButton>
                  <IconButton
                    label={`删除分类 ${category.name}`}
                    onPress={() => deleteDialog.open(category)}
                    size="sm"
                    tone="warnish"
                  >
                    <Trash2 aria-hidden />
                  </IconButton>
                </div>
              </div>
            ))}
          </RowStack>
        )}
      </div>

      <AppDialog
        isOpen={dialogOpen}
        onOpenChange={setDialogOpen}
        size="md"
        title={editing ? `编辑「${editing.name}」` : '新建分类'}
      >
        <div className="grid gap-5">
          <TextField
            isRequired
            label="分类名"
            onChange={(value) =>
              setForm((current) => ({ ...current, name: value }))
            }
            value={form.name}
          />

          <div className="grid gap-2">
            <FieldLabel>封面</FieldLabel>
            {form.cover ? (
              <div
                className="
                  overflow-hidden rounded-control border border-rule bg-well
                "
              >
                <AssetImage
                  alt="分类封面预览"
                  className="aspect-video w-full object-cover"
                  src={form.cover}
                />
              </div>
            ) : null}
            <div className="flex items-center gap-2">
              <Button
                icon={<ImagePlus aria-hidden />}
                onPress={() => setPickerOpen(true)}
                size="sm"
              >
                {form.cover ? '更换封面' : '选择封面'}
              </Button>
              {form.cover ? (
                <IconButton
                  label="移除封面"
                  onPress={() =>
                    setForm((current) => ({
                      ...current,
                      cover: '',
                      coverAssetId: null,
                    }))
                  }
                  size="sm"
                >
                  <X aria-hidden />
                </IconButton>
              ) : null}
            </div>
            <input
              aria-label="分类封面外部 URL"
              className={cn(controlClass, 'font-mono text-base')}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  cover: event.target.value,
                  coverAssetId: null,
                }))
              }
              placeholder="或粘贴外部封面 URL"
              value={form.cover}
            />
          </div>

          {error ? <Alert>{error}</Alert> : null}

          <div className="flex justify-end gap-2">
            <Button onPress={() => setDialogOpen(false)}>取消</Button>
            <Button
              isLoading={saveMutation.isPending}
              onPress={() => void save()}
              tone="solid"
            >
              {editing ? '保存修改' : '创建'}
            </Button>
          </div>
        </div>
      </AppDialog>

      <ConfirmDialog
        confirmLabel="删除分类"
        isDestructive
        isOpen={deleteDialog.isOpen}
        message={
          deleteDialog.data
            ? deleteDialog.data.articleCount > 0
              ? `「${deleteDialog.data.name}」下还有 ${String(deleteDialog.data.articleCount)} 篇文章，需要先把它们移到别的分类。`
              : `「${deleteDialog.data.name}」下没有文章，可以安全删除。`
            : ''
        }
        onCancel={deleteDialog.dismiss}
        onConfirm={() => void remove()}
        onExited={deleteDialog.clear}
        title={
          deleteDialog.data ? `删除分类「${deleteDialog.data.name}」？` : ''
        }
      />

      <AssetPickerDialog
        onClose={() => setPickerOpen(false)}
        onSelect={(asset: AssetDto) => {
          setForm((current) => ({
            ...current,
            cover: asset.deliveryUrl,
            coverAssetId: asset.id,
          }));
          setPickerOpen(false);
        }}
        open={pickerOpen}
        purpose="CATEGORY_COVER"
        title="选择分类封面"
      />
    </PageBody>
  );
};
