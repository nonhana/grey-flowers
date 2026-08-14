import type {
  ArticleSnapshot,
  CategoryAdmin,
  TagAdmin,
} from '@grey-flowers/contracts';

import { useNavigate } from '@tanstack/react-router';
import { cn } from 'cnfast';
import { ChevronDown, Eye, ImagePlus, Trash2, X } from 'lucide-react';
import { useState } from 'react';

import type { useArticleEditor } from '@/store/article-editor.js';

import { useDialog } from '@/hooks/use-dialog.js';
import { formatDateTime } from '@/lib/format.js';
import { Button, IconButton } from '@/ui/button.js';
import { PublishBadge } from '@/ui/feedback.js';
import {
  controlClass,
  FilterChip,
  TextAreaField,
  TextField,
} from '@/ui/form.js';
import { AssetImage } from '@/ui/image.js';
import { ConfirmDialog } from '@/ui/overlay.js';
import { MetaLine, SectionLabel } from '@/ui/surface.js';

import { slugFromTo } from '../display.js';
import { AssetPickerDialog } from './asset-picker.js';

type Editor = ReturnType<typeof useArticleEditor>;

type PendingConfirm =
  | { kind: 'delete' }
  | { kind: 'publish' }
  | { kind: 'restore'; snapshot: ArticleSnapshot }
  | { kind: 'unpublish' };

const CONFIRM_COPY: Record<
  'delete' | 'publish' | 'restore' | 'unpublish',
  { confirmLabel: string; destructive: boolean; title: string }
> = {
  delete: {
    confirmLabel: '删除文章',
    destructive: true,
    title: '删除这篇文章？',
  },
  publish: {
    confirmLabel: '发布',
    destructive: false,
    title: '发布这篇文章？',
  },
  restore: {
    confirmLabel: '恢复',
    destructive: false,
    title: '恢复到这个旧版本？',
  },
  unpublish: {
    confirmLabel: '下架',
    destructive: true,
    title: '从主站下架？',
  },
};

const Block = ({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) => (
  <div className="grid gap-2">
    <SectionLabel>{label}</SectionLabel>
    {children}
  </div>
);

const VersionList = ({ editor }: { editor: Editor }) => {
  const [expanded, setExpanded] = useState<number | null>(null);
  const restoreDialog = useDialog<ArticleSnapshot>();

  return (
    <>
      <Button
        icon={<ChevronDown aria-hidden />}
        onPress={() => void editor.loadVersions()}
        size="sm"
      >
        加载版本快照
      </Button>
      {editor.versions === null ? null : editor.versions.length === 0 ? (
        <p className="text-xs/relaxed text-ink-dim">
          还没有快照。发布、下架或冲突覆盖时会自动留一份。
        </p>
      ) : (
        <ul className="grid gap-2">
          {editor.versions.map((snapshot) => (
            <li
              className="rounded-control border border-rule p-2.5"
              key={snapshot.id}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-2xs text-ink-dim">
                  rev {snapshot.revision} · {formatDateTime(snapshot.createdAt)}
                </span>
                <div className="flex gap-1">
                  <Button
                    onPress={() =>
                      setExpanded((current) =>
                        current === snapshot.id ? null : snapshot.id,
                      )
                    }
                    size="sm"
                    tone="ghost"
                  >
                    {expanded === snapshot.id ? '收起' : '查看'}
                  </Button>
                  <Button
                    onPress={() => restoreDialog.open(snapshot)}
                    size="sm"
                  >
                    恢复
                  </Button>
                </div>
              </div>
              <p className="mt-1 truncate text-base text-ink">
                {snapshot.title}
              </p>
              {expanded === snapshot.id ? (
                <pre
                  className="
                    mt-2 max-h-48 overflow-auto rounded-control bg-well p-2
                    font-mono text-2xs/relaxed whitespace-pre-wrap text-ink-dim
                  "
                >
                  {snapshot.content}
                </pre>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        confirmLabel="恢复"
        isOpen={restoreDialog.isOpen}
        message={
          restoreDialog.data
            ? `恢复到 rev ${String(restoreDialog.data.revision)} 会产生一个新版本，且无法撤销。`
            : ''
        }
        onCancel={restoreDialog.dismiss}
        onConfirm={() => {
          const target = restoreDialog.data;
          restoreDialog.dismiss();
          if (target) void editor.restoreVersion(target);
        }}
        onExited={restoreDialog.clear}
        title="恢复到这个旧版本？"
      />
    </>
  );
};

export const InspectorPane = ({
  categories,
  editor,
  onClose,
  tags,
}: {
  categories: CategoryAdmin[];
  editor: Editor;
  onClose?: () => void;
  tags: TagAdmin[];
}) => {
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const confirmDialog = useDialog<PendingConfirm>();
  const navigate = useNavigate();

  const draft = editor.draft;
  if (!draft || !editor.article) return null;

  const { article } = editor;
  const confirmCopy = confirmDialog.data
    ? CONFIRM_COPY[confirmDialog.data.kind]
    : null;

  const runConfirm = () => {
    const pending = confirmDialog.data;
    confirmDialog.dismiss();
    if (!pending) return;
    if (pending.kind === 'publish') void editor.publish();
    if (pending.kind === 'unpublish') void editor.unpublish();
    if (pending.kind === 'restore')
      void editor.restoreVersion(pending.snapshot);
    if (pending.kind === 'delete')
      void editor.removeArticle().then((removed) => {
        if (removed) void navigate({ to: '/articles' });
      });
  };

  return (
    <div className="grid h-full content-start gap-6 p-4 pb-8">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-mono text-xs text-ink-dim">元数据</h2>
        {onClose ? (
          <IconButton label="收起元数据" onPress={onClose} size="sm">
            <X aria-hidden />
          </IconButton>
        ) : null}
      </div>

      <div className="grid gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <PublishBadge published={article.published} />
          <MetaLine>
            <span>rev {article.revision}</span>
            <span>{formatDateTime(article.editedAt)}</span>
          </MetaLine>
        </div>
        <MetaLine>
          <span>{article.wordCount} 字</span>
          <span className="truncate">/{slugFromTo(article.to)}</span>
        </MetaLine>
      </div>

      <TextField
        label="标题"
        onChange={(value) => editor.updateDraft({ title: value })}
        value={draft.title}
      />

      <TextAreaField
        inputClassName="font-sans"
        label="简介"
        onChange={(value) => editor.updateDraft({ description: value || null })}
        rows={3}
        value={draft.description ?? ''}
      />

      <Block label="封面">
        {draft.cover ? (
          <div
            className="
              overflow-hidden rounded-control border border-rule bg-well
            "
          >
            <AssetImage
              alt="封面预览"
              className="aspect-video w-full object-cover"
              src={draft.cover}
            />
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            icon={<ImagePlus aria-hidden />}
            onPress={() => setCoverPickerOpen(true)}
            size="sm"
          >
            {draft.cover ? '更换封面' : '选择封面'}
          </Button>
          {draft.cover ? (
            <IconButton
              label="移除封面"
              onPress={() =>
                editor.updateDraft({ cover: '', coverAssetId: null })
              }
              size="sm"
            >
              <X aria-hidden />
            </IconButton>
          ) : null}
        </div>
        <input
          aria-label="封面外部 URL"
          className={cn(controlClass, 'font-mono text-base')}
          onChange={(event) =>
            editor.updateDraft({
              cover: event.target.value,
              coverAssetId: null,
            })
          }
          onKeyDown={(event) => event.stopPropagation()}
          placeholder="或粘贴外部封面 URL"
          value={draft.cover}
        />
      </Block>

      <TextField
        description="图片无法显示时读到的文字，也用于无障碍阅读。"
        label="封面替代文字"
        onChange={(value) => editor.updateDraft({ alt: value })}
        value={draft.alt}
      />

      <Block label="分类">
        <div className="flex flex-wrap gap-1.5">
          <FilterChip
            isSelected={draft.categoryId === null}
            onPress={() =>
              editor.updateDraft({ category: null, categoryId: null })
            }
          >
            未分类
          </FilterChip>
          {categories.map((category) => (
            <FilterChip
              isSelected={draft.categoryId === category.id}
              key={category.id}
              onPress={() =>
                editor.updateDraft({
                  category: category.name,
                  categoryId: category.id,
                })
              }
            >
              {category.name}
            </FilterChip>
          ))}
        </div>
      </Block>

      <Block label="标签">
        <div className="flex flex-wrap items-center gap-1.5">
          {draft.tags.map((name) => (
            <span
              className="
                inline-flex min-h-8 items-center gap-1 rounded-full border
                border-rule bg-well pr-1 pl-2.5 font-mono text-2xs text-ink
              "
              key={name}
            >
              {name}
              <IconButton
                className="
                  size-6
                  [&_svg]:size-3
                "
                label={`移除标签 ${name}`}
                onPress={() =>
                  editor.updateDraft({
                    tags: draft.tags.filter((item) => item !== name),
                  })
                }
                size="sm"
              >
                <X aria-hidden />
              </IconButton>
            </span>
          ))}
          <input
            aria-label="添加标签"
            className={cn(controlClass, 'min-h-8 w-28 py-1 text-base')}
            list="gf-tag-options"
            onKeyDown={(event) => {
              event.stopPropagation();
              if (event.key !== 'Enter') return;
              event.preventDefault();
              const value = event.currentTarget.value.trim();
              if (value && !draft.tags.includes(value)) {
                editor.updateDraft({ tags: [...draft.tags, value] });
              }
              event.currentTarget.value = '';
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
      </Block>

      <div className="grid gap-2">
        <Button
          isDisabled={!editor.canPublish}
          onPress={() => {
            void editor.requestPreview().then((url) => {
              if (url) window.open(url, '_blank', 'noopener');
            });
          }}
        >
          打开主站
        </Button>
        <p className="text-2xs/relaxed text-ink-dim">
          编辑区已是所见即所得；这个按钮只在真实主站做发布前最终确认，草稿会自动生成一次性预览链接。
        </p>
        <Button
          icon={<Trash2 aria-hidden />}
          onPress={() => confirmDialog.open({ kind: 'delete' })}
          tone="warnish"
        >
          删除文章
        </Button>
      </div>

      <div className="grid gap-2 border-t border-rule pt-5">
        <SectionLabel>版本</SectionLabel>
        <VersionList editor={editor} />
      </div>

      {/*
        「发布」是这一列唯一的去处，不能排在一条会滚出视口的长队末尾。
        吸底：桌面端贴在面板下沿，移动端贴在 sheet 下沿，两处都在可滚容器内。
      */}
      <div
        className="
          sticky bottom-0 -mx-4 -mb-8 border-t border-rule bg-(--gf-surface)
          px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]
        "
      >
        <Button
          className="w-full"
          icon={<Eye aria-hidden />}
          isDisabled={!editor.canPublish}
          onPress={() =>
            confirmDialog.open({
              kind: article.published ? 'unpublish' : 'publish',
            })
          }
          size="lg"
          tone="solid"
        >
          {article.published ? '从主站下架' : '发布到主站'}
        </Button>
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

      <ConfirmDialog
        confirmLabel={confirmCopy?.confirmLabel ?? ''}
        isDestructive={confirmCopy?.destructive ?? false}
        isOpen={confirmDialog.isOpen}
        message={
          confirmDialog.data?.kind === 'publish'
            ? '发布后这篇文章会立即对主站访客可见。'
            : confirmDialog.data?.kind === 'unpublish'
              ? '下架后主站会立即隐藏这篇文章，内容和版本都会保留。'
              : '文章会从主站和后台移除，封面与正文里用到的资产不受影响。此操作不可撤销。'
        }
        onCancel={confirmDialog.dismiss}
        onConfirm={runConfirm}
        onExited={confirmDialog.clear}
        title={confirmCopy?.title ?? ''}
      />
    </div>
  );
};
