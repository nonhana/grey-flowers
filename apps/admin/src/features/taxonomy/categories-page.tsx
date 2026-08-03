import type { AssetDto, CategoryAdmin } from '@grey-flowers/contracts';

import { ImagePlus, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from 'react-aria-components';

import { apiClient, isApiRequestError } from '../../app/api/index.js';
import { AssetPickerDialog } from '../articles/editor/asset-picker.js';

interface CategoryForm {
  cover: string;
  coverAssetId: number | null;
  name: string;
}

const EMPTY_FORM: CategoryForm = { cover: '', coverAssetId: null, name: '' };

export function CategoriesPage() {
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

  useEffect(() => {
    let cancelled = false;

    apiClient.taxonomy
      .listCategories()
      .then((data) => {
        if (cancelled) return;
        setItems(data.items);
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

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(category: CategoryAdmin) {
    setEditing(category);
    setForm({
      cover: category.cover,
      coverAssetId: category.coverAssetId,
      name: category.name,
    });
    setError(null);
    setDialogOpen(true);
  }

  async function handleSave() {
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
      if (editing) {
        await apiClient.taxonomy.updateCategory(editing.id, input);
      } else {
        await apiClient.taxonomy.createCategory(input);
      }
      setDialogOpen(false);
      setLoading(true);
      setError(null);
      setReloadKey((current) => current + 1);
    } catch (saveError) {
      setError(
        isApiRequestError(saveError, 'CONFLICT')
          ? `分类名「${name}」已被使用。`
          : isApiRequestError(saveError)
            ? saveError.message
            : '保存失败。',
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    try {
      await apiClient.taxonomy.deleteCategory(pendingDelete.id);
      setPendingDelete(null);
      setLoading(true);
      setError(null);
      setReloadKey((current) => current + 1);
    } catch (deleteError) {
      setError(
        isApiRequestError(deleteError, 'CONFLICT')
          ? `分类「${pendingDelete.name}」下仍有文章，请先移除或迁移这些文章。`
          : isApiRequestError(deleteError)
            ? deleteError.message
            : '删除失败。',
      );
      setPendingDelete(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl p-5">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-[1.4rem] font-medium text-ink-strong">分类</h1>
        <Button
          className="
            inline-flex min-h-11 items-center gap-2 rounded-control border
            border-transparent bg-primary px-4 font-mono text-[0.82rem]
            text-on-primary
            hover:bg-primary-deep
            [&_svg]:size-4
          "
          onPress={openCreate}
        >
          <Plus aria-hidden="true" />
          新建分类
        </Button>
      </header>

      {error ? (
        <p
          className="
            mt-4 border-l-[3px] border-l-danger-edge bg-danger-soft px-3 py-2
            text-[0.84rem] text-danger-ink
          "
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-5 grid gap-3">
        {loading ? (
          <div className="flex justify-center py-12 text-ink-faint">
            <Loader2 aria-hidden="true" className="animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <p className="py-12 text-center text-ink-muted">还没有分类。</p>
        ) : (
          items.map((category) => (
            <div
              className="
                flex items-center gap-4 rounded-panel border border-edge
                bg-surface p-4
              "
              key={category.id}
            >
              <div
                className="
                  grid size-14 shrink-0 place-items-center overflow-hidden
                  rounded-control border border-edge bg-input
                "
              >
                {category.cover ? (
                  <img
                    alt={category.name}
                    className="object-cover"
                    src={category.cover}
                  />
                ) : (
                  <ImagePlus
                    aria-hidden="true"
                    className="size-5 text-ink-faint"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="
                    truncate text-[0.95rem] font-medium text-ink-strong
                  "
                >
                  {category.name}
                </p>
                <p className="font-mono text-[0.72rem] text-ink-faint">
                  {category.articleCount} 篇文章
                </p>
              </div>
              <div className="flex gap-1.5">
                <Button
                  aria-label={`编辑分类 ${category.name}`}
                  className="
                    grid size-10.5 place-items-center rounded-control border
                    border-edge text-ink-soft
                    hover:bg-accent
                    focus-visible:outline-[3px] focus-visible:outline-offset-2
                    focus-visible:outline-focus-outline
                    [&_svg]:size-4
                  "
                  onPress={() => openEdit(category)}
                >
                  <Pencil aria-hidden="true" />
                </Button>
                <Button
                  aria-label={`删除分类 ${category.name}`}
                  className="
                    grid size-10.5 place-items-center rounded-control border
                    border-danger-edge text-danger-text
                    hover:bg-danger-soft
                    focus-visible:outline-[3px] focus-visible:outline-offset-2
                    focus-visible:outline-focus-outline
                    [&_svg]:size-4
                  "
                  onPress={() => setPendingDelete(category)}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {dialogOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-6">
          <div
            aria-modal="true"
            className="
              grid w-full max-w-md gap-4 rounded-panel border border-edge
              bg-surface p-5 shadow-panel
            "
            role="dialog"
          >
            <h2 className="font-mono text-[0.9rem] text-ink-strong">
              {editing ? `编辑分类：${editing.name}` : '新建分类'}
            </h2>

            <div className="grid gap-1.5">
              <span className="font-mono text-[0.72rem] text-ink-faint">
                分类名 *
              </span>
              <input
                aria-label="分类名"
                className="
                  min-h-11 w-full rounded-control border border-input-edge
                  bg-input px-3 text-[0.95rem] text-primary-ink outline-none
                  hover:border-input-hover-edge
                  focus-visible:border-focus focus-visible:ring-[3px]
                  focus-visible:ring-focus-ring
                "
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                value={form.name}
              />
            </div>

            <div className="grid gap-1.5">
              <span className="font-mono text-[0.72rem] text-ink-faint">
                封面
              </span>
              {form.cover ? (
                <div
                  className="
                    grid aspect-video w-full overflow-hidden rounded-control
                    border border-edge bg-input
                  "
                >
                  <img
                    alt="分类封面预览"
                    className="object-cover"
                    src={form.cover}
                  />
                </div>
              ) : null}
              <div className="flex items-center gap-2">
                <Button
                  className="
                    flex min-h-10.5 items-center gap-2 rounded-control border
                    border-input-edge bg-input px-3 font-mono text-[0.76rem]
                    text-ink-soft
                    hover:border-input-hover-edge
                    [&_svg]:size-4
                  "
                  onPress={() => setPickerOpen(true)}
                >
                  <ImagePlus aria-hidden="true" />
                  选择封面
                </Button>
                {form.coverAssetId !== null ? (
                  <Button
                    aria-label="移除封面"
                    className="
                      grid size-10 place-items-center rounded-control
                      text-ink-faint
                      hover:bg-accent
                    "
                    onPress={() =>
                      setForm((current) => ({
                        ...current,
                        cover: '',
                        coverAssetId: null,
                      }))
                    }
                  >
                    <X aria-hidden="true" />
                  </Button>
                ) : null}
              </div>
              <input
                aria-label="分类封面外部 URL"
                className="
                  min-h-11 w-full rounded-control border border-input-edge
                  bg-input px-3 font-mono text-[0.84rem] text-primary-ink
                  outline-none
                  placeholder:text-input-placeholder
                  hover:border-input-hover-edge
                  focus-visible:border-focus focus-visible:ring-[3px]
                  focus-visible:ring-focus-ring
                "
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

            <div className="flex justify-end gap-2">
              <Button
                className="
                  min-h-10.5 rounded-control border border-edge px-3.5 font-mono
                  text-[0.8rem] text-ink-soft
                  hover:bg-accent
                "
                onPress={() => setDialogOpen(false)}
              >
                取消
              </Button>
              <Button
                className="
                  inline-flex min-h-10.5 items-center gap-1.5 rounded-control
                  border border-transparent bg-primary px-4 font-mono
                  text-[0.8rem] text-on-primary
                  hover:bg-primary-deep
                "
                isDisabled={saving}
                onPress={() => void handleSave()}
              >
                {saving ? (
                  <Loader2 aria-hidden="true" className="animate-spin" />
                ) : null}
                {editing ? '保存修改' : '创建'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {pendingDelete ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-6">
          <div
            className="
              w-full max-w-sm rounded-panel border border-edge bg-surface p-5
              shadow-panel
            "
            role="alertdialog"
            aria-modal="true"
          >
            <p className="text-[0.9rem] leading-relaxed text-ink">
              删除分类「{pendingDelete.name}
              」：仅当分类下没有文章时才允许删除。确定删除吗？
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                className="
                  min-h-10.5 rounded-control border border-edge px-3.5 font-mono
                  text-[0.8rem] text-ink-soft
                  hover:bg-accent
                "
                onPress={() => setPendingDelete(null)}
              >
                取消
              </Button>
              <Button
                className="
                  min-h-10.5 rounded-control border border-transparent bg-danger
                  px-3.5 font-mono text-[0.8rem] text-white
                  hover:brightness-90
                "
                onPress={() => void handleDelete()}
              >
                确认删除
              </Button>
            </div>
          </div>
        </div>
      ) : null}

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
    </div>
  );
}
