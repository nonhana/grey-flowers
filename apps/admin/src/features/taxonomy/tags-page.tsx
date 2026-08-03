import type { TagAdmin } from '@grey-flowers/contracts';

import { Plus, Tags as TagsIcon, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { apiClient, isApiRequestError } from '@/app/api/index.js';
import {
  Alert,
  Button,
  ConfirmDialog,
  controlClass,
  EmptyState,
  FilterChip,
  IconButton,
  PageBody,
  PageHeader,
  RowSkeleton,
  RowStack,
} from '@/ui/index.js';

export const TagsPage = () => {
  const [items, setItems] = useState<TagAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unusedOnly, setUnusedOnly] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<TagAdmin | null>(null);

  // 请求条件一变就在渲染期切回加载态（React 官方的「按输入调整 state」模式）。
  const requestKey = `${String(unusedOnly)}|${String(reloadKey)}`;
  const [prevRequestKey, setPrevRequestKey] = useState(requestKey);
  if (prevRequestKey !== requestKey) {
    setPrevRequestKey(requestKey);
    setLoading(true);
  }

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
    } catch (createError) {
      setError(
        isApiRequestError(createError, 'CONFLICT')
          ? `已经有一个叫「${name}」的标签了。`
          : '创建失败，请重试。',
      );
    } finally {
      setCreating(false);
    }
  };

  const remove = async () => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);
    try {
      await apiClient.taxonomy.deleteTag(target.id);
      setReloadKey((current) => current + 1);
    } catch (deleteError) {
      setError(
        isApiRequestError(deleteError) ? deleteError.message : '删除失败。',
      );
    }
  };

  return (
    <PageBody width="narrow">
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
          icon={<Plus aria-hidden="true" />}
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

      <div className="mt-5">
        {loading ? (
          <RowSkeleton rows={4} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<TagsIcon aria-hidden="true" />}
            title={unusedOnly ? '没有闲置的标签' : '还没有标签'}
          >
            {unusedOnly
              ? '每个标签都至少挂着一篇文章。'
              : '在上面的输入框里敲一个名字回车，或者在编辑文章时直接输入新标签。'}
          </EmptyState>
        ) : (
          <RowStack>
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
                  onPress={() => setPendingDelete(tag)}
                  size="sm"
                  tone="warnish"
                >
                  <Trash2 aria-hidden="true" />
                </IconButton>
              </div>
            ))}
          </RowStack>
        )}
      </div>

      <ConfirmDialog
        confirmLabel="删除标签"
        isDestructive
        isOpen={pendingDelete !== null}
        message={
          pendingDelete
            ? `引用「${pendingDelete.name}」的 ${String(pendingDelete.articleCount)} 篇文章会解除这个标签，文章本身不受影响。`
            : ''
        }
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void remove()}
        title={pendingDelete ? `删除标签「${pendingDelete.name}」？` : ''}
      />
    </PageBody>
  );
};
