import type { CategoryAdmin, TagAdmin } from '@grey-flowers/contracts';

import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { cn } from 'cn';
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  Loader2,
  PanelRight,
  WifiOff,
} from 'lucide-react';
import { useState, type Dispatch, type SetStateAction } from 'react';
import {
  Button as AriaButton,
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
} from 'react-aria-components';

import { articlesListOptions } from '@/app/server-state/articles.js';
import {
  taxonomyCategoriesOptions,
  taxonomyTagsOptions,
} from '@/app/server-state/taxonomy.js';
import { useIsDesktop } from '@/hooks/use-media-query.js';
import { formatDateTime } from '@/lib/format.js';
import { useArticleEditor } from '@/store/article-editor.js';
import { Button, buttonClass, IconButton } from '@/ui/button.js';
import { Alert, StatusReadout } from '@/ui/feedback.js';
import { Hint } from '@/ui/hint.js';
import { AppDialog, BottomSheet, SidePanel } from '@/ui/overlay.js';

import { CodeMirrorPane } from './editor/code-mirror-pane.js';
import { InspectorPane } from './editor/inspector-pane.js';

type Editor = ReturnType<typeof useArticleEditor>;

interface RecentArticle {
  id: number;
  title: string;
}

const saveStatus = (editor: Editor) => {
  switch (editor.phase) {
    case 'saving':
      return {
        icon: <Loader2 aria-hidden className="animate-spin" />,
        label: '保存中',
        tone: 'busy' as const,
      };
    case 'saved':
      return {
        icon: undefined,
        label: `已保存 · rev ${String(editor.revision)}`,
        tone: 'ok' as const,
      };
    case 'conflict':
      return {
        icon: <AlertTriangle aria-hidden />,
        label: '有冲突待处理',
        tone: 'err' as const,
      };
    case 'offline':
      return {
        icon: <WifiOff aria-hidden />,
        label: '离线 · 草稿存在本机',
        tone: 'warn' as const,
      };
    default:
      return {
        icon: undefined,
        label: '未保存',
        tone: 'warn' as const,
      };
  }
};

const TitleSwitcher = ({
  articleId,
  recent,
  title,
}: {
  articleId: number | null;
  recent: RecentArticle[];
  title: string;
}) => {
  const navigate = useNavigate();
  const others = recent.filter((item) => item.id !== articleId);

  if (others.length === 0) {
    return (
      <span className="truncate text-base font-bold text-ink-strong">
        {title}
      </span>
    );
  }

  return (
    <MenuTrigger>
      <AriaButton
        className="
          flex min-w-0 items-center gap-1 rounded-control px-1.5 py-1 text-base
          font-bold text-ink-strong transition-colors
          hover:bg-accent-wash hover:text-accent-text
        "
      >
        <span className="truncate">{title}</span>
        <ChevronDown aria-hidden className="size-3.5 shrink-0" />
      </AriaButton>
      <Popover
        className="
          max-h-80 w-72 overflow-y-auto rounded-panel bg-case-raised p-1
          shadow-float
        "
      >
        <Menu
          className="grid gap-0.5 outline-none"
          onAction={(key) => {
            void navigate({
              params: { articleId: String(key) },
              to: '/articles/$articleId',
            });
          }}
        >
          {others.map((item) => (
            <MenuItem
              className="
                cursor-pointer truncate rounded-control px-2.5 py-2 text-base
                text-ink outline-none
                data-focused:bg-accent-wash data-focused:text-accent-text
              "
              id={item.id}
              key={item.id}
              textValue={item.title || '（未命名）'}
            >
              {item.title || '（未命名）'}
            </MenuItem>
          ))}
        </Menu>
      </Popover>
    </MenuTrigger>
  );
};

const ConflictDialog = ({
  editor,
  revision,
}: {
  editor: Editor;
  revision: number | null;
}) => (
  <AppDialog
    isDismissable={false}
    isOpen
    onOpenChange={() => undefined}
    size="sm"
    title="内容冲突"
  >
    {revision === null ? (
      <>
        <p className="text-base/relaxed text-ink">
          这篇文章在另一个窗口被改过，但服务端版本暂时拉取失败。
        </p>
        {editor.lastError ? (
          <p className="mt-2 text-sm text-ink-dim">{editor.lastError}</p>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button onPress={() => void editor.retryConflict()} tone="solid">
            重试加载
          </Button>
        </div>
      </>
    ) : (
      <>
        <p className="text-base/relaxed text-ink">
          这篇文章在另一个窗口被改过，服务端已经到 rev {revision}。选一份留下：
        </p>
        <ul className="mt-4 grid gap-2 text-base/relaxed text-ink-dim">
          <li className="rounded-control border border-rule p-3">
            <b className="text-ink-strong">保留我的</b>
            ：用当前编辑内容覆盖服务端，并先为服务端那一版留一份快照。
          </li>
          <li className="rounded-control border border-rule p-3">
            <b className="text-ink-strong">采用服务端</b>
            ：丢弃本地修改，载入服务端最新版本。
          </li>
        </ul>
        <div className="mt-5 flex justify-end gap-2">
          <Button onPress={() => void editor.resolveConflict('take-server')}>
            采用服务端
          </Button>
          <Button
            onPress={() => void editor.resolveConflict('keep-mine')}
            tone="solid"
          >
            保留我的
          </Button>
        </div>
      </>
    )}
  </AppDialog>
);

const WorkspacePage = ({
  inspectorOpen,
  numericId,
  setInspectorOpen,
}: {
  inspectorOpen: boolean;
  numericId: number | null;
  setInspectorOpen: Dispatch<SetStateAction<boolean>>;
}) => {
  const editor = useArticleEditor(numericId);
  const isDesktop = useIsDesktop();
  const recentQuery = useQuery(
    articlesListOptions({ page: 1, pageSize: 20, status: 'all' }),
  );
  const categoriesQuery = useQuery(taxonomyCategoriesOptions());
  const tagsQuery = useQuery(taxonomyTagsOptions(false));
  const recent: RecentArticle[] = (recentQuery.data?.items ?? []).map(
    (item) => ({ id: item.id, title: item.title }),
  );
  const options: { categories: CategoryAdmin[]; tags: TagAdmin[] } | null =
    categoriesQuery.data && tagsQuery.data
      ? {
          categories: categoriesQuery.data.items,
          tags: tagsQuery.data.items,
        }
      : null;

  if (editor.loading) {
    return (
      <div className="grid h-full place-items-center text-ink-dim">
        <Loader2 aria-hidden className="size-5 animate-spin" />
      </div>
    );
  }

  if (editor.loadError) {
    return (
      <div className="grid h-full place-items-center p-6">
        <div className="grid max-w-sm justify-items-center gap-4 text-center">
          <p className="text-md text-ink">{editor.loadError}</p>
          <Link className={buttonClass()} to="/articles">
            <ArrowLeft aria-hidden className="size-4" />
            返回文章列表
          </Link>
        </div>
      </div>
    );
  }

  // 分类/标签元数据加载失败（M9）：给出明确错误块与重试入口，
  // 不再 return null 白屏；恢复后正常进入编辑器。
  if (categoriesQuery.error || tagsQuery.error) {
    return (
      <div className="grid h-full place-items-center p-6">
        <div className="grid max-w-sm justify-items-center gap-4 text-center">
          <p className="text-md text-ink">
            文章分类或标签加载失败，编辑器元数据不可用。
          </p>
          <div className="flex items-center gap-2">
            <Button
              onPress={() => {
                void categoriesQuery.refetch();
                void tagsQuery.refetch();
              }}
            >
              重试
            </Button>
            <Link className={buttonClass()} to="/articles">
              <ArrowLeft aria-hidden className="size-4" />
              返回文章列表
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!editor.draft || !options) return null;
  const status = saveStatus(editor);
  const restoreCandidate = editor.restoreCandidate;
  const inspector = (
    <InspectorPane
      categories={options.categories}
      editor={editor}
      onClose={isDesktop ? () => setInspectorOpen(false) : undefined}
      tags={options.tags}
    />
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-paper">
      {/* 移动端顶栏直接压在纸上 —— 用投影；桌面端下面还是字盘（工具条），
          同一种物质之间用发丝线。 */}
      <header
        className="
          relative z-10 flex min-h-12 shrink-0 items-center justify-between
          gap-3 bg-case px-2 pt-[env(safe-area-inset-top)] shadow-case-down
          md:border-b md:border-rule md:px-3 md:shadow-none
        "
      >
        <div className="flex min-w-0 items-center gap-1">
          <Link
            aria-label="返回文章列表"
            className="
              grid size-9 shrink-0 place-items-center rounded-control
              text-ink-dim transition-colors
              hover:bg-accent-wash hover:text-accent-text
            "
            to="/articles"
          >
            <ArrowLeft aria-hidden className="size-4.5" />
          </Link>
          <TitleSwitcher
            articleId={numericId}
            recent={recent}
            title={editor.draft.title || '（未命名）'}
          />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusReadout
            icon={status.icon}
            label={status.label}
            tone={status.tone}
          />
          <Hint label={inspectorOpen ? '收起元数据' : '展开元数据'}>
            <IconButton
              className={cn(
                inspectorOpen && isDesktop && 'bg-accent-wash text-accent-text',
              )}
              label={inspectorOpen ? '收起元数据' : '展开元数据'}
              onPress={() => setInspectorOpen((open) => !open)}
              size="sm"
            >
              <PanelRight aria-hidden />
            </IconButton>
          </Hint>
        </div>
      </header>

      {restoreCandidate ? (
        <Alert
          action={
            <div className="flex gap-2">
              <Button
                onPress={() => void editor.discardRestored()}
                size="sm"
                tone="ghost"
              >
                放弃
              </Button>
              <Button
                onPress={() => editor.applyRestored(restoreCandidate)}
                size="sm"
                tone="solid"
              >
                恢复
              </Button>
            </div>
          }
          className="shrink-0 rounded-none border-x-0 border-t-0"
          tone="warn"
        >
          本机存着一份未保存的本地草稿（
          {formatDateTime(restoreCandidate.savedAt)}
          ）。
        </Alert>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <CodeMirrorPane
          onChange={(value) => editor.updateDraft({ content: value })}
          onRequestSave={() => {
            void editor.flushNow();
          }}
          value={editor.draft.content}
        />
        {isDesktop ? (
          <SidePanel isOpen={inspectorOpen} label="元数据">
            {inspector}
          </SidePanel>
        ) : null}
      </div>

      {isDesktop ? null : (
        <BottomSheet
          isOpen={inspectorOpen}
          onOpenChange={setInspectorOpen}
          title="元数据"
        >
          {inspector}
        </BottomSheet>
      )}

      {editor.phase === 'conflict' ? (
        <ConflictDialog
          editor={editor}
          revision={editor.conflict?.server.revision ?? null}
        />
      ) : null}
    </div>
  );
};

/** 外壳持有关键切换后要存活的 UI 状态；内层按文章 id 作 key 重挂载，
 *  重挂载即重新拉取最近文章与元数据选项（React 官方「key 重置全部状态」模式）。 */
export const ArticleWorkspacePage = () => {
  const { articleId } = useParams({ strict: false }) as { articleId: string };
  // 路由 id 严格解析（M14）：/^\d+$/ 且 >0 才是合法文章 id；非法（如
  // /articles/abc、/articles/0）渲染内联无效态（复用 loadError 的视觉
  // 结构），不再静默落进新建模式。
  const valid = /^\d+$/.test(articleId) && Number(articleId) > 0;
  const numericId = valid ? Number(articleId) : null;
  const isDesktop = useIsDesktop();
  const [inspectorOpen, setInspectorOpen] = useState(isDesktop);
  if (!valid) {
    return (
      <div className="grid h-full place-items-center p-6">
        <div className="grid max-w-sm justify-items-center gap-4 text-center">
          <p className="text-md text-ink">链接无效：找不到这篇文章。</p>
          <Link className={buttonClass()} to="/articles">
            <ArrowLeft aria-hidden className="size-4" />
            返回文章列表
          </Link>
        </div>
      </div>
    );
  }
  return (
    <WorkspacePage
      inspectorOpen={inspectorOpen}
      key={numericId}
      numericId={numericId}
      setInspectorOpen={setInspectorOpen}
    />
  );
};
