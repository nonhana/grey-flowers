import type { AssetDto, CategoryAdmin } from '@grey-flowers/contracts';

import { cn } from 'cnfast';
import { FolderTree, ImagePlus, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { apiClient, isApiRequestError } from '@/app/api/index.js';
import { AssetPickerDialog } from '@/features/articles/editor/asset-picker.js';
import {
  Alert,
  AppDialog,
  AssetImage,
  Button,
  ConfirmDialog,
  controlClass,
  EmptyState,
  FieldLabel,
  IconButton,
  PageBody,
  PageHeader,
  RowSkeleton,
  RowStack,
  TextField,
} from '@/ui/index.js';

interface CategoryForm {
  cover: string;
  coverAssetId: number | null;
  name: string;
}

const EMPTY_FORM: CategoryForm = { cover: '', coverAssetId: null, name: '' };

export const CategoriesPage = () => {
  const [items, setItems] = useState<CategoryAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<CategoryAdmin | null>(null);
  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<CategoryAdmin | null>(
    null,
  );

  // 请求条件一变就在渲染期切回加载态（React 官方的「按输入调整 state」模式）。
  const [prevReloadKey, setPrevReloadKey] = useState(reloadKey);
  if (prevReloadKey !== reloadKey) {
    setPrevReloadKey(reloadKey);
    setLoading(true);
  }

  useEffect(() => {
    let cancelled = false;

    apiClient.taxonomy
      .listCategories()
      .then((data) => {
        if (!cancelled) setItems(data.items);
      })
      .catch((loadError: unknown) => {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : '加载失败。');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

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

  const save = async () => {
    const name = form.name.trim();
    if (!name) {
      setError('分类名不能为空。');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const input = {
        cover: form.cover,
        coverAssetId: form.coverAssetId,
        name,
      };
      if (editing) await apiClient.taxonomy.updateCategory(editing.id, input);
      else await apiClient.taxonomy.createCategory(input);
      setDialogOpen(false);
      setReloadKey((current) => current + 1);
    } catch (saveError) {
      setError(
        isApiRequestError(saveError, 'CONFLICT')
          ? `已经有一个叫「${name}」的分类了。`
          : isApiRequestError(saveError)
            ? saveError.message
            : '保存失败，请重试。',
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);
    try {
      await apiClient.taxonomy.deleteCategory(target.id);
      setReloadKey((current) => current + 1);
    } catch (deleteError) {
      setError(
        isApiRequestError(deleteError, 'CONFLICT')
          ? `分类「${target.name}」下还有文章，先把它们移到别处再删。`
          : isApiRequestError(deleteError)
            ? deleteError.message
            : '删除失败。',
      );
    }
  };

  return (
    <PageBody width="narrow">
      <PageHeader
        actions={
          <Button
            icon={<Plus aria-hidden="true" />}
            onPress={openCreate}
            tone="solid"
          >
            新建分类
          </Button>
        }
        description="一篇文章只属于一个分类。分类下还有文章时不能删除。"
        title="分类"
      />

      {error && !dialogOpen ? <Alert className="mt-4">{error}</Alert> : null}

      <div className="mt-5">
        {loading ? (
          <RowSkeleton rows={3} />
        ) : items.length === 0 ? (
          <EmptyState
            action={
              <Button
                icon={<Plus aria-hidden="true" />}
                onPress={openCreate}
                tone="solid"
              >
                新建分类
              </Button>
            }
            icon={<FolderTree aria-hidden="true" />}
            title="还没有分类"
          >
            分类是文章的主干目录，会显示在主站的导航里。没有分类的文章会归入「未分类」。
          </EmptyState>
        ) : (
          <RowStack>
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
                    <ImagePlus
                      aria-hidden="true"
                      className="size-4 text-ink-dim"
                    />
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
                    <Pencil aria-hidden="true" />
                  </IconButton>
                  <IconButton
                    label={`删除分类 ${category.name}`}
                    onPress={() => setPendingDelete(category)}
                    size="sm"
                    tone="warnish"
                  >
                    <Trash2 aria-hidden="true" />
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
                icon={<ImagePlus aria-hidden="true" />}
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
                  <X aria-hidden="true" />
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
            <Button isLoading={saving} onPress={() => void save()} tone="solid">
              {editing ? '保存修改' : '创建'}
            </Button>
          </div>
        </div>
      </AppDialog>

      <ConfirmDialog
        confirmLabel="删除分类"
        isDestructive
        isOpen={pendingDelete !== null}
        message={
          pendingDelete
            ? pendingDelete.articleCount > 0
              ? `「${pendingDelete.name}」下还有 ${String(pendingDelete.articleCount)} 篇文章，需要先把它们移到别的分类。`
              : `「${pendingDelete.name}」下没有文章，可以安全删除。`
            : ''
        }
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void remove()}
        title={pendingDelete ? `删除分类「${pendingDelete.name}」？` : ''}
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
