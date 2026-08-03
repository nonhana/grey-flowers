import type { TagAdmin } from '@grey-flowers/contracts';

import { cn } from 'cnfast';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from 'react-aria-components';

import { apiClient, isApiRequestError } from '@/app/api/index.js';

export const TagsPage = () => {
  const [items, setItems] = useState<TagAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unusedOnly, setUnusedOnly] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<TagAdmin | null>(null);

  useEffect(() => {
    let cancelled = false;

    apiClient.taxonomy
      .listTags(unusedOnly)
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
  }, [reloadKey, unusedOnly]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    setError(null);
    try {
      await apiClient.taxonomy.createTag(name);
      setNewName('');
      setLoading(true);
      setError(null);
      setReloadKey((current) => current + 1);
    } catch (createError) {
      setError(
        isApiRequestError(createError, 'CONFLICT')
          ? `标签「${name}」已存在。`
          : '创建失败。',
      );
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await apiClient.taxonomy.deleteTag(pendingDelete.id);
      setPendingDelete(null);
      setLoading(true);
      setError(null);
      setReloadKey((current) => current + 1);
    } catch (deleteError) {
      setError(
        isApiRequestError(deleteError) ? deleteError.message : '删除失败。',
      );
      setPendingDelete(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl p-5">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-[1.4rem] font-medium text-ink-strong">标签</h1>
        <button
          className={cn(
            'min-h-10.5 rounded-full border px-3.5 font-mono text-[0.76rem]',
            unusedOnly
              ? 'border-brand bg-vapor text-brand'
              : `
                border-edge text-ink-soft
                hover:border-input-hover-edge
              `,
          )}
          onClick={() => {
            const next = !unusedOnly;
            setUnusedOnly(next);
            setLoading(true);
            setError(null);
          }}
          type="button"
        >
          只看未使用
        </button>
      </header>

      <div className="mt-5 flex items-center gap-2">
        <input
          aria-label="新标签名"
          className="
            min-h-11 w-full flex-1 rounded-control border border-input-edge
            bg-input px-3 text-[0.95rem] text-primary-ink outline-none
            placeholder:text-input-placeholder
            hover:border-input-hover-edge
            focus-visible:border-focus focus-visible:ring-[3px]
            focus-visible:ring-focus-ring
          "
          onChange={(event) => setNewName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void handleCreate();
          }}
          placeholder="输入新标签名，回车创建"
          value={newName}
        />
        <Button
          className="
            inline-flex min-h-11 items-center gap-1.5 rounded-control border
            border-transparent bg-primary px-4 font-mono text-[0.8rem]
            text-on-primary
            hover:bg-primary-deep
            [&_svg]:size-4
          "
          isDisabled={creating || !newName.trim()}
          onPress={() => void handleCreate()}
        >
          {creating ? (
            <Loader2 aria-hidden="true" className="animate-spin" />
          ) : (
            <Plus aria-hidden="true" />
          )}
          创建
        </Button>
      </div>

      {error ? (
        <p
          className="
            mt-3 border-l-[3px] border-l-danger-edge bg-danger-soft px-3 py-2
            text-[0.84rem] text-danger-ink
          "
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-5 grid gap-2">
        {loading ? (
          <div className="flex justify-center py-12 text-ink-faint">
            <Loader2 aria-hidden="true" className="animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <p className="py-12 text-center text-ink-muted">
            {unusedOnly ? '没有未使用的标签。' : '还没有标签。'}
          </p>
        ) : (
          items.map((tag) => (
            <div
              className="
                flex items-center justify-between gap-3 rounded-panel border
                border-edge bg-surface px-4 py-3
              "
              key={tag.id}
            >
              <div className="min-w-0">
                <p
                  className="
                    truncate text-[0.95rem] font-medium text-ink-strong
                  "
                >
                  {tag.name}
                </p>
                <p className="font-mono text-[0.72rem] text-ink-faint">
                  {tag.articleCount} 篇文章
                </p>
              </div>
              <Button
                aria-label={`删除标签 ${tag.name}`}
                className="
                  grid size-10.5 shrink-0 place-items-center rounded-control
                  border border-danger-edge text-danger-text
                  hover:bg-danger-soft
                  focus-visible:outline-[3px] focus-visible:outline-offset-2
                  focus-visible:outline-focus-outline
                  [&_svg]:size-4
                "
                onPress={() => setPendingDelete(tag)}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
          ))
        )}
      </div>

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
              删除标签「{pendingDelete.name}
              」：引用它的文章将从标签中解除，文章本身不受影响。确定删除吗？
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
    </div>
  );
};
