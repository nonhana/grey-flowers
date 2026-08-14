import type { TagAdmin } from '@grey-flowers/contracts';

import { Plus, Tags as TagsIcon, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { apiClient } from '@/app/api/index.js';
import { useDerivedReset } from '@/hooks/use-derived-reset.js';
import { useDialog } from '@/hooks/use-dialog.js';
import { toastError } from '@/lib/toast.js';
import { Button, IconButton } from '@/ui/button.js';
import { Alert, EmptyState, Skeleton } from '@/ui/feedback.js';
import { controlClass, FilterChip } from '@/ui/form.js';
import { ConfirmDialog } from '@/ui/overlay.js';
import { PageBody, PageHeader, RowStack } from '@/ui/surface.js';

/** 与真实标签行同构：名称 / 计数两段 + 删除位，落地时行高不跳。 */
const TagRowSkeleton = () => (
  <div
    aria-hidden
    className="flex items-center justify-between gap-3 px-4 py-3"
  >
    <div className="min-w-0">
      <Skeleton className="h-[1.6em] w-32 text-md" />
      <Skeleton className="h-[1.45em] w-16 text-2xs" />
    </div>
    <Skeleton className="size-8 shrink-0 rounded-control" />
  </div>
);

export const TagsPage = () => {
  const [items, setItems] = useState<TagAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unusedOnly, setUnusedOnly] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const deleteDialog = useDialog<TagAdmin>();

  // 请求条件一变就在渲染期切回加载态（React 官方的「按输入调整 state」模式）。
  const requestKey = `${String(unusedOnly)}|${String(reloadKey)}`;
  useDerivedReset(requestKey, () => {
    setLoading(true);
  });

  useEffect(() => {
    let cancelled = false;

    apiClient.taxonomy
      .listTags(unusedOnly)
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
  }, [reloadKey, unusedOnly]);

  const create = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    setError(null);
    try {
      await apiClient.taxonomy.createTag(name);
      setNewName('');
      setReloadKey((current) => current + 1);
      toast.success(`已创建标签「${name}」。`);
    } catch (createError) {
      toastError(createError, {
        CONFLICT: `已经有一个叫「${name}」的标签了。`,
      });
    } finally {
      setCreating(false);
    }
  };

  const remove = async () => {
    const target = deleteDialog.data;
    if (!target) return;
    deleteDialog.dismiss();
    try {
      await apiClient.taxonomy.deleteTag(target.id);
      setReloadKey((current) => current + 1);
      toast.success(`已删除标签「${target.name}」。`);
    } catch (deleteError) {
      toastError(deleteError);
    }
  };

  return (
    <PageBody scroll="child" width="narrow">
      <PageHeader
        actions={
          <FilterChip
            isSelected={unusedOnly}
            onPress={() => setUnusedOnly((current) => !current)}
          >
            只看未使用
          </FilterChip>
        }
        description="标签是文章之间的横向联系。删除标签不会影响文章本身。"
        title="标签"
      />

      <div className="mt-5 flex items-center gap-2">
        <input
          aria-label="新标签名"
          className={controlClass}
          onChange={(event) => setNewName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void create();
          }}
          placeholder="输入新标签名，回车创建"
          value={newName}
        />
        <Button
          icon={<Plus aria-hidden />}
          isDisabled={!newName.trim()}
          isLoading={creating}
          onPress={() => void create()}
          size="lg"
          tone="solid"
        >
          创建
        </Button>
      </div>

      {error ? <Alert className="mt-3">{error}</Alert> : null}

      <div className="mt-5 min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {loading ? (
          <RowStack className="animate-content-in" key="skeleton">
            {Array.from({ length: 4 }, (_, index) => (
              <TagRowSkeleton key={index} />
            ))}
          </RowStack>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<TagsIcon aria-hidden />}
            title={unusedOnly ? '没有闲置的标签' : '还没有标签'}
          >
            {unusedOnly
              ? '每个标签都至少挂着一篇文章。'
              : '在上面的输入框里敲一个名字回车，或者在编辑文章时直接输入新标签。'}
          </EmptyState>
        ) : (
          <RowStack className="animate-content-in" key="content">
            {items.map((tag) => (
              <div
                className="flex items-center justify-between gap-3 px-4 py-3"
                key={tag.id}
              >
                <div className="min-w-0">
                  <p className="truncate text-md text-ink-strong">{tag.name}</p>
                  <p className="font-mono text-2xs text-ink-dim">
                    {tag.articleCount} 篇文章
                  </p>
                </div>
                <IconButton
                  label={`删除标签 ${tag.name}`}
                  onPress={() => deleteDialog.open(tag)}
                  size="sm"
                  tone="warnish"
                >
                  <Trash2 aria-hidden />
                </IconButton>
              </div>
            ))}
          </RowStack>
        )}
      </div>

      <ConfirmDialog
        confirmLabel="删除标签"
        isDestructive
        isOpen={deleteDialog.isOpen}
        message={
          deleteDialog.data
            ? `引用「${deleteDialog.data.name}」的 ${String(deleteDialog.data.articleCount)} 篇文章会解除这个标签，文章本身不受影响。`
            : ''
        }
        onCancel={deleteDialog.dismiss}
        onConfirm={() => void remove()}
        onExited={deleteDialog.clear}
        title={
          deleteDialog.data ? `删除标签「${deleteDialog.data.name}」？` : ''
        }
      />
    </PageBody>
  );
};
