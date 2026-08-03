import type {
  ArticleSnapshot,
  CategoryAdmin,
  TagAdmin,
} from '@grey-flowers/contracts';

import { cn } from 'cnfast';
import { ChevronDown, Eye, ImagePlus, Trash2, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from 'react-aria-components';

import type { useArticleEditor } from './use-article-editor.js';

import { formatDateTime, slugFromTo } from '../display.js';
import { AssetPickerDialog } from './asset-picker.js';

type Editor = ReturnType<typeof useArticleEditor>;

const SectionLabel = ({ children, id }: { children: string; id?: string }) => {
  return (
    <h3
      className="
        font-mono text-[0.7rem] tracking-[0.14em] text-ink-faint uppercase
      "
      id={id}
    >
      {children}
    </h3>
  );
};

const inputClass = (base: string) => {
  return cn(
    `
      min-h-10.5 w-full rounded-control border border-input-edge bg-input
      px-2.75 py-2 text-[0.9rem] leading-normal text-primary-ink
      transition-colors outline-none
      placeholder:text-input-placeholder
      hover:border-input-hover-edge
      focus-visible:border-focus focus-visible:ring-[3px]
      focus-visible:ring-focus-ring
    `,
    base,
  );
};

interface InspectorPaneProps {
  categories: CategoryAdmin[];
  editor: Editor;
  tags: TagAdmin[];
}

interface ConfirmDialogProps {
  confirmLabel: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}

const ConfirmDialog = ({
  confirmLabel,
  message,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) => {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-6"
      role="presentation"
    >
      <div
        className="
          w-full max-w-sm rounded-panel border border-edge bg-surface p-5
          shadow-panel
        "
        role="alertdialog"
        aria-modal="true"
      >
        <p className="text-[0.9rem] leading-relaxed text-ink">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button
            className="
              min-h-10.5 rounded-control border border-edge px-3.5 font-mono
              text-[0.8rem] text-ink-soft
              hover:bg-accent
            "
            onPress={onCancel}
          >
            取消
          </Button>
          <Button
            className="
              min-h-10.5 rounded-control border border-transparent bg-danger
              px-3.5 font-mono text-[0.8rem] text-white
              hover:brightness-90
            "
            onPress={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

export const InspectorPane = ({
  categories,
  editor,
  tags,
}: InspectorPaneProps) => {
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [expandedSnapshot, setExpandedSnapshot] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState<
    'publish' | 'unpublish' | null
  >(null);
  const [restoreSnapshot, setRestoreSnapshot] =
    useState<ArticleSnapshot | null>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);

  const draft = editor.draft;
  if (!draft || !editor.article) return null;

  const { article } = editor;

  return (
    <div
      className="
        flex h-full flex-col gap-5 overflow-y-auto p-4 font-mono text-[0.8rem]
      "
    >
      <div className="grid gap-1.5">
        <SectionLabel>状态</SectionLabel>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'rounded-full border px-2.5 py-1 text-[0.72rem]',
              article.published
                ? 'border-brand/30 bg-vapor text-brand'
                : 'bg-accent text-ink-soft',
            )}
          >
            {article.published ? '已发布' : '草稿'}
          </span>
          <span className="text-ink-faint">
            rev {article.revision} · {formatDateTime(article.editedAt)} 更新
          </span>
        </div>
        <div className="text-ink-faint">
          ids {article.wordCount} 字 · {slugFromTo(article.to)}
        </div>
      </div>

      <div className="grid gap-1.5">
        <SectionLabel>标题</SectionLabel>
        <input
          aria-label="文章标题"
          className={inputClass('')}
          onKeyDown={(event) => event.stopPropagation()}
          onChange={(event) =>
            editor.updateDraft({ title: event.target.value })
          }
          value={draft.title}
        />
      </div>

      <div className="grid gap-1.5">
        <SectionLabel>简介</SectionLabel>
        <textarea
          aria-label="文章简介"
          className={cn(
            inputClass('min-h-20 resize-y'),
            'leading-relaxed',
            'font-sans',
          )}
          onChange={(event) =>
            editor.updateDraft({ description: event.target.value || null })
          }
          onKeyDown={(event) => event.stopPropagation()}
          value={draft.description ?? ''}
        />
      </div>

      <div className="grid gap-1.5">
        <SectionLabel>封面</SectionLabel>
        {draft.cover ? (
          <div
            className="
              mb-1 grid aspect-video w-full overflow-hidden rounded-control
              border border-edge bg-input
            "
          >
            <img alt="封面预览" className="object-cover" src={draft.cover} />
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            className="
              flex min-h-10.5 items-center gap-2 rounded-control border
              border-input-edge bg-input px-3 text-[0.8rem] text-ink-soft
              hover:border-input-hover-edge
              focus-visible:outline-[3px] focus-visible:outline-offset-2
              focus-visible:outline-focus-outline
              [&_svg]:size-4
            "
            onPress={() => setCoverPickerOpen(true)}
          >
            <ImagePlus aria-hidden="true" />
            选择封面
          </Button>
          {draft.coverAssetId !== null ? (
            <Button
              aria-label="移除封面资产"
              className="
                grid size-10.5 place-items-center rounded-control text-ink-faint
                hover:bg-accent
              "
              onPress={() =>
                editor.updateDraft({ cover: '', coverAssetId: null })
              }
            >
              <X aria-hidden="true" />
            </Button>
          ) : null}
        </div>
        <input
          aria-label="封面外部 URL"
          className={inputClass('')}
          onKeyDown={(event) => event.stopPropagation()}
          onChange={(event) =>
            editor.updateDraft({
              cover: event.target.value,
              coverAssetId: null,
            })
          }
          placeholder="或粘贴外部封面 URL"
          value={draft.cover}
        />
      </div>

      <div className="grid gap-1.5">
        <SectionLabel>封面声明文字（alt）</SectionLabel>
        <input
          aria-label="封面 alt"
          className={inputClass('')}
          onKeyDown={(event) => event.stopPropagation()}
          onChange={(event) => editor.updateDraft({ alt: event.target.value })}
          value={draft.alt}
        />
      </div>

      <div className="grid gap-1.5">
        <SectionLabel>分类</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          <button
            className={cn(
              'min-h-10 rounded-full border px-3 text-[0.78rem]',
              draft.categoryId === null
                ? 'border-brand bg-vapor text-brand'
                : `
                  border-edge text-ink-soft
                  hover:border-input-hover-edge
                `,
            )}
            onClick={() =>
              editor.updateDraft({ categoryId: null, category: null })
            }
            type="button"
          >
            未分类
          </button>
          {categories.map((category) => (
            <button
              className={cn(
                'min-h-10 rounded-full border px-3 text-[0.78rem]',
                draft.categoryId === category.id
                  ? 'border-brand bg-vapor text-brand'
                  : `
                    border-edge text-ink-soft
                    hover:border-input-hover-edge
                  `,
              )}
              key={category.id}
              onClick={() =>
                editor.updateDraft({
                  category: category.name,
                  categoryId: category.id,
                })
              }
              type="button"
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-1.5">
        <SectionLabel id="article-tags-label">标签</SectionLabel>
        <div className="flex flex-wrap items-center gap-1.5">
          {draft.tags.map((name) => (
            <span
              className="
                inline-flex min-h-9 items-center gap-1 rounded-full border
                border-edge bg-accent px-2.5 text-[0.76rem] text-accent-text
              "
              key={name}
            >
              {name}
              <button
                aria-label={`移除标签 ${name}`}
                className="
                  grid size-5 place-items-center rounded-full
                  hover:bg-black/10
                "
                onClick={() =>
                  editor.updateDraft({
                    tags: draft.tags.filter((item) => item !== name),
                  })
                }
                type="button"
              >
                <X aria-hidden="true" className="size-3" />
              </button>
            </span>
          ))}
          <input
            ref={tagInputRef}
            aria-labelledby="article-tags-label"
            className={inputClass('min-h-9 w-32')}
            list="gf-tag-options"
            onKeyDown={(event) => {
              event.stopPropagation();
              if (event.key === 'Enter') {
                event.preventDefault();
                const value = event.currentTarget.value.trim();
                if (value && !draft.tags.includes(value)) {
                  editor.updateDraft({ tags: [...draft.tags, value] });
                }
                event.currentTarget.value = '';
              }
            }}
            placeholder="添加…"
          />
          <datalist id="gf-tag-options">
            {tags
              .filter((tag) => !draft.tags.includes(tag.name))
              .map((tag) => (
                <option key={tag.name} value={tag.name}>
                  {tag.name}
                </option>
              ))}
          </datalist>
        </div>
      </div>

      <div className="grid gap-2 border-t border-edge pt-4">
        <Button
          className="
            flex min-h-11 items-center justify-center gap-2 rounded-control
            border border-transparent bg-primary px-3 font-mono text-[0.82rem]
            text-on-primary transition-colors
            hover:bg-primary-deep
            focus-visible:outline-[3px] focus-visible:outline-offset-2
            focus-visible:outline-focus-outline
            [&_svg]:size-4
          "
          isDisabled={!editor.canPublish}
          onPress={() => {
            if (article.published) setConfirmPublish('unpublish');
            else setConfirmPublish('publish');
          }}
        >
          <Eye aria-hidden="true" />
          {article.published ? '下架' : '发布'}
        </Button>
        <Button
          className="
            flex min-h-11 items-center justify-center gap-2 rounded-control
            border border-edge px-3 font-mono text-[0.82rem] text-ink-soft
            hover:bg-accent hover:text-accent-text
            focus-visible:outline-[3px] focus-visible:outline-offset-2
            focus-visible:outline-focus-outline
          "
          isDisabled={!editor.canPublish}
          onPress={() => {
            void editor.requestPreview().then((url) => {
              if (url) window.open(url, '_blank', 'noopener');
            });
          }}
        >
          预览
        </Button>
        <Button
          className="
            flex min-h-11 items-center justify-center gap-2 rounded-control
            border border-danger-edge px-3 font-mono text-[0.82rem]
            text-danger-text
            hover:bg-danger-soft
            focus-visible:outline-[3px] focus-visible:outline-offset-2
            focus-visible:outline-focus-outline
            [&_svg]:size-4
          "
          onPress={() => setConfirmDelete(true)}
        >
          <Trash2 aria-hidden="true" />
          删除文章
        </Button>
      </div>

      <div className="grid gap-2 border-t border-edge pt-4">
        <SectionLabel>版本</SectionLabel>
        <Button
          className="
            flex min-h-10 items-center gap-1 rounded-control border border-edge
            px-3 text-[0.78rem] text-ink-soft
            hover:bg-accent
            focus-visible:outline-[3px] focus-visible:outline-offset-2
            focus-visible:outline-focus-outline
          "
          onPress={() => void editor.loadVersions()}
        >
          <ChevronDown aria-hidden="true" className="size-4" />
          加载版本快照
        </Button>
        {editor.versions === null ? null : editor.versions.length === 0 ? (
          <p className="text-[0.76rem] text-ink-muted">
            尚无快照。发布 / 下架 / 冲突覆盖时自动生成。
          </p>
        ) : (
          <ul className="grid gap-2">
            {editor.versions.map((snapshot) => (
              <li
                className="rounded-control border border-edge p-2.5"
                key={snapshot.id}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[0.76rem] text-ink-soft">
                    rev {snapshot.revision} ·{' '}
                    {formatDateTime(snapshot.createdAt)}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      className="
                        min-h-8 rounded-control border border-edge px-2
                        text-[0.7rem] text-ink-soft
                        hover:bg-accent
                      "
                      onPress={() =>
                        setExpandedSnapshot((current) =>
                          current === snapshot.id ? null : snapshot.id,
                        )
                      }
                    >
                      {expandedSnapshot === snapshot.id ? '收起' : '查看'}
                    </Button>
                    <Button
                      className="
                        min-h-8 rounded-control border border-brand/40 px-2
                        text-[0.7rem] text-brand
                        hover:bg-vapor
                      "
                      onPress={() => setRestoreSnapshot(snapshot)}
                    >
                      恢复
                    </Button>
                  </div>
                </div>
                <p className="mt-1 truncate text-[0.8rem] text-ink">
                  {snapshot.title}
                </p>
                {expandedSnapshot === snapshot.id ? (
                  <pre
                    className="
                      mt-2 max-h-48 overflow-auto rounded-sm bg-canvas p-2
                      text-[0.7rem] leading-relaxed whitespace-pre-wrap
                      text-ink-muted
                    "
                  >
                    {snapshot.content}
                  </pre>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <AssetPickerDialog
        onClose={() => setCoverPickerOpen(false)}
        onSelect={(asset) => {
          editor.updateDraft({
            cover: asset.deliveryUrl,
            coverAssetId: asset.id,
          });
          setCoverPickerOpen(false);
        }}
        open={coverPickerOpen}
        purpose="ARTICLE_COVER"
        title="选择文章封面"
      />

      {confirmPublish ? (
        <ConfirmDialog
          confirmLabel={confirmPublish === 'publish' ? '确认发布' : '确认下架'}
          message={
            confirmPublish === 'publish'
              ? '发布后主站将对访客可见。确定发布这篇文章吗？'
              : '下架后主站将立即隐藏这篇文章。确定下架吗？'
          }
          onCancel={() => setConfirmPublish(null)}
          onConfirm={() => {
            const action =
              confirmPublish === 'publish'
                ? editor.publish()
                : editor.unpublish();
            setConfirmPublish(null);
            void action;
          }}
        />
      ) : null}

      {restoreSnapshot ? (
        <ConfirmDialog
          confirmLabel="恢复旧版本"
          message={`确定恢复到 rev ${restoreSnapshot.revision} 吗？恢复后会产生一个新版本且无法撤销。`}
          onCancel={() => setRestoreSnapshot(null)}
          onConfirm={() => {
            const target = restoreSnapshot;
            setRestoreSnapshot(null);
            void editor.restoreVersion(target);
          }}
        />
      ) : null}

      {confirmDelete ? (
        <ConfirmDialog
          confirmLabel="确认删除"
          message="删除后文章将从主站和后台移除（封面与正文资产不受影响）。此操作不可撤销。确定删除吗？"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            setConfirmDelete(false);
            void editor.removeArticle();
          }}
        />
      ) : null}
    </div>
  );
};
