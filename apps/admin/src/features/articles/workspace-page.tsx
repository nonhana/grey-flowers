import type { CategoryAdmin, TagAdmin } from '@grey-flowers/contracts';

import { Link } from '@tanstack/react-router';
import { cn } from 'cnfast';
import {
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Settings2,
  WifiOff,
} from 'lucide-react';
import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { Button, Modal, ModalOverlay } from 'react-aria-components';
import { Group, Panel, Separator } from 'react-resizable-panels';

import { apiClient } from '../../app/api/index.js';
import { CodeMirrorPane } from './editor/code-mirror-pane.js';
import { InspectorPane } from './editor/inspector-pane.js';
import { useArticleEditor } from './editor/use-article-editor.js';

const useDesktopMedia = () => {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia('(min-width: 768px)');
      media.addEventListener('change', onChange);
      window.addEventListener('resize', onChange);
      return () => {
        media.removeEventListener('change', onChange);
        window.removeEventListener('resize', onChange);
      };
    },
    () => window.matchMedia('(min-width: 768px)').matches,
    () => false,
  );
};

interface WorkspacePageProps {
  articleId: string;
}

const ArticleNavPane = ({
  articleId,
  recent,
}: {
  articleId: number | null;
  recent: Array<{
    id: number;
    published: boolean;
    revision: number;
    title: string;
  }>;
}) => {
  return (
    <nav
      aria-label="文章导航"
      className="
        flex h-full flex-col gap-1 overflow-y-auto border-r border-edge
        bg-surface p-2.5
      "
    >
      <p
        className="
          px-2 pb-1 font-mono text-[0.68rem] tracking-[0.14em] text-ink-faint
          uppercase
        "
      >
        最近文章
      </p>
      {recent.map((article) => (
        <Link
          className={cn(
            `
              flex min-h-10 items-center justify-between gap-2 rounded-control
              px-2.5 text-[0.8rem] leading-snug text-ink-soft
              hover:bg-accent
            `,
            article.id === articleId && 'bg-vapor text-brand',
          )}
          key={article.id}
          to="/articles/$articleId"
          params={{ articleId: String(article.id) }}
        >
          <span className="truncate">{article.title || '（未命名）'}</span>
          <span className="shrink-0 font-mono text-[0.66rem]">
            {article.revision}
          </span>
        </Link>
      ))}
    </nav>
  );
};

const useSaveStatus = (editor: ReturnType<typeof useArticleEditor>) => {
  switch (editor.phase) {
    case 'saving':
      return {
        icon: <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />,
        label: '保存中…',
        tone: 'busy' as const,
      };
    case 'saved':
      return {
        icon: null,
        label: `已保存 · rev ${editor.revision}`,
        tone: 'ok' as const,
      };
    case 'conflict':
      return {
        icon: <AlertTriangle aria-hidden="true" className="size-3.5" />,
        label: '内容冲突，请处理',
        tone: 'err' as const,
      };
    case 'offline':
      return {
        icon: <WifiOff aria-hidden="true" className="size-3.5" />,
        label: '离线，草稿已本地保存',
        tone: 'warn' as const,
      };
    default:
      return {
        icon: <AlertTriangle aria-hidden="true" className="size-3.5" />,
        label: '未保存',
        tone: 'warn' as const,
      };
  }
};

const RestoreBanner = ({
  onApply,
  onDiscard,
  savedAt,
}: {
  onApply: () => void;
  onDiscard: () => void;
  savedAt: number;
}) => {
  return (
    <div
      className="
        fixed inset-x-0 bottom-4 z-40 mx-auto w-[min(96vw,30rem)] rounded-panel
        border border-warning/50 bg-surface p-4 shadow-panel
      "
      role="alert"
    >
      <p className="text-[0.86rem] font-medium text-ink">
        检测到一份本地未保存的草稿
      </p>
      <p className="mt-1 text-[0.78rem] text-ink-muted">
        保存于{' '}
        {new Intl.DateTimeFormat('zh-CN', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(savedAt)}
        。它比服务端版本更新。是否恢复？
      </p>
      <div className="mt-3 flex justify-end gap-2">
        <Button
          className="
            min-h-10.5 rounded-control border border-edge px-3.5 font-mono
            text-[0.8rem] text-ink-soft
            hover:bg-accent
          "
          onPress={onDiscard}
        >
          放弃
        </Button>
        <Button
          className="
            min-h-10.5 rounded-control border border-transparent bg-primary
            px-3.5 font-mono text-[0.8rem] text-on-primary
            hover:bg-primary-deep
          "
          onPress={onApply}
        >
          恢复草稿
        </Button>
      </div>
    </div>
  );
};

const ConflictDialog = ({
  editor,
  revision,
}: {
  editor: ReturnType<typeof useArticleEditor>;
  revision: number;
}) => {
  return (
    <ModalOverlay
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-6"
      isOpen
    >
      <Modal
        className="
          w-full max-w-md rounded-panel border border-edge bg-surface p-5
          shadow-panel outline-none
        "
      >
        <h2
          className="
            flex items-center gap-2 font-mono text-[0.9rem] text-danger-ink
          "
        >
          <AlertTriangle aria-hidden="true" />
          内容冲突
        </h2>
        <p className="mt-2 text-[0.85rem] leading-relaxed text-ink">
          这篇文章在另一个窗口被修改（服务端已到 rev {revision}
          ）。请选择如何处理：
        </p>
        <ul className="mt-4 grid gap-2 text-[0.8rem]">
          <li
            className="
              rounded-control border border-edge bg-canvas p-3 text-ink-soft
            "
          >
            保留我的：以当前编辑内容覆盖服务端，并先为服务端旧版本留一份快照。
          </li>
          <li
            className="
              rounded-control border border-edge bg-canvas p-3 text-ink-soft
            "
          >
            采用服务端：丢弃本地修改，加载服务端最新版本。
          </li>
        </ul>
        <div className="mt-5 flex justify-end gap-2">
          <Button
            className="
              min-h-10.5 rounded-control border border-edge px-3.5 font-mono
              text-[0.8rem] text-ink-soft
              hover:bg-accent
            "
            onPress={() => void editor.resolveConflict('take-server')}
          >
            采用服务端
          </Button>
          <Button
            className="
              min-h-10.5 rounded-control border border-transparent bg-primary
              px-3.5 font-mono text-[0.8rem] text-on-primary
              hover:bg-primary-deep
            "
            onPress={() => void editor.resolveConflict('keep-mine')}
          >
            保留我的
          </Button>
        </div>
      </Modal>
    </ModalOverlay>
  );
};

const MobileToolsSheet = ({
  children,
  isOpen,
  onOpenChange,
}: {
  children: ReactNode;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  return (
    <ModalOverlay
      className="fixed inset-0 z-50 bg-black/40"
      isDismissable
      isOpen={isOpen}
      onOpenChange={onOpenChange}
    >
      <Modal
        className="
          absolute inset-x-0 top-auto bottom-0 max-h-[85vh] overflow-y-auto
          rounded-t-panel border border-b-0 border-edge bg-surface p-4
          pb-[env(safe-area-inset-bottom)] shadow-panel outline-none
        "
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-edge" />
        {children}
      </Modal>
    </ModalOverlay>
  );
};

export const ArticleWorkspacePage = ({ articleId }: WorkspacePageProps) => {
  const numericId = useMemo(
    () => Number.parseInt(articleId, 10) || null,
    [articleId],
  );
  const editor = useArticleEditor(numericId);
  const isDesktop = useDesktopMedia();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [recent, setRecent] = useState<
    Array<{
      id: number;
      published: boolean;
      revision: number;
      title: string;
    }>
  >([]);
  const [options, setOptions] = useState<{
    categories: CategoryAdmin[];
    tags: TagAdmin[];
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      apiClient.articles.list({ page: 1, pageSize: 20, status: 'all' }),
      apiClient.taxonomy.listCategories(),
      apiClient.taxonomy.listTags(),
    ]).then(([articles, categories, tags]) => {
      if (cancelled) return;
      setRecent(
        articles.items.map((item) => ({
          id: item.id,
          published: item.published,
          revision: item.revision,
          title: item.title,
        })),
      );
      setOptions({ categories: categories.items, tags: tags.items });
    });
    return () => {
      cancelled = true;
    };
  }, [articleId]);

  const status = useSaveStatus(editor);
  const restoreCandidate = editor.restoreCandidate;

  if (editor.loading) {
    return (
      <div className="grid min-h-full place-items-center p-8 text-ink-muted">
        <Loader2 aria-hidden="true" className="animate-spin" />
      </div>
    );
  }

  if (editor.loadError) {
    return (
      <div className="grid min-h-full place-items-center p-8">
        <div
          className="
            max-w-sm rounded-panel border border-edge bg-surface p-5 text-center
          "
        >
          <p className="text-ink">{editor.loadError}</p>
          <Link
            className="
              mt-4 inline-flex min-h-10.5 items-center gap-1 font-mono
              text-[0.82rem] text-brand
              hover:underline
            "
            to="/articles"
          >
            <ArrowLeft aria-hidden="true" />
            返回文章列表
          </Link>
        </div>
      </div>
    );
  }

  if (!editor.draft || !options) return null;

  const inspector = (
    <InspectorPane
      categories={options.categories}
      editor={editor}
      tags={options.tags}
    />
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header
        className="
          flex min-h-12 items-center justify-between gap-3 border-b border-edge
          bg-surface px-4
        "
      >
        <div className="flex min-w-0 items-center gap-3">
          <Link
            aria-label="返回文章列表"
            className="
              grid size-9 shrink-0 place-items-center rounded-control
              text-ink-faint
              hover:bg-accent
            "
            to="/articles"
          >
            <ArrowLeft aria-hidden="true" className="size-4.5" />
          </Link>
          <span className="truncate text-[0.86rem] font-medium text-ink-strong">
            {editor.draft.title || '（未命名）'}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={cn(
              `
                hidden items-center gap-1 rounded-full border px-2.5 py-1
                font-mono text-[0.7rem]
                sm:inline-flex
              `,
              status.tone === 'ok' && 'border-brand/30 bg-vapor text-brand',
              status.tone === 'busy' && 'border-edge bg-accent text-ink-soft',
              status.tone === 'warn' &&
                'border-warning/40 bg-warning/10 text-warning',
              status.tone === 'err' &&
                'border-danger-edge bg-danger-soft text-danger-ink',
            )}
          >
            {status.icon}
            <span aria-live="polite">{status.label}</span>
          </span>
          <Button
            className="
              inline-flex min-h-10.5 items-center gap-1.5 rounded-control border
              border-edge px-3 font-mono text-[0.78rem] text-ink-soft
              hover:bg-accent hover:text-accent-text
              focus-visible:outline-[3px] focus-visible:outline-offset-2
              focus-visible:outline-focus-outline
              md:hidden
              [&_svg]:size-4
            "
            onPress={() => setSheetOpen(true)}
          >
            <Settings2 aria-hidden="true" />
            元数据
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1">
        {isDesktop ? (
          <Group
            className="h-full"
            id="gf-article-workspace"
            orientation="horizontal"
          >
            <Panel id="nav" defaultSize={260} maxSize={420} minSize={140}>
              <ArticleNavPane articleId={numericId} recent={recent} />
            </Panel>
            <Separator
              className="
                w-1 bg-edge/60
                data-separator:hover:bg-brand/40
              "
              id="nav-separator"
            />
            <Panel id="editor" minSize={320}>
              <CodeMirrorPane
                onChange={(value) => editor.updateDraft({ content: value })}
                value={editor.draft.content}
              />
            </Panel>
            <Separator
              className="
                w-1 bg-edge/60
                data-separator:hover:bg-brand/40
              "
              id="editor-separator"
            />
            <Panel
              collapsible
              collapsedSize={0}
              defaultSize={380}
              id="inspector"
              maxSize={560}
              minSize={240}
            >
              {inspector}
            </Panel>
          </Group>
        ) : (
          <div className="h-full">
            <CodeMirrorPane
              onChange={(value) => editor.updateDraft({ content: value })}
              value={editor.draft.content}
            />
          </div>
        )}
      </div>

      <MobileToolsSheet
        isOpen={sheetOpen}
        onOpenChange={(open) => setSheetOpen(open)}
      >
        {inspector}
      </MobileToolsSheet>

      {restoreCandidate ? (
        <RestoreBanner
          onApply={() => editor.applyRestored(restoreCandidate)}
          onDiscard={() => void editor.discardRestored()}
          savedAt={restoreCandidate.savedAt}
        />
      ) : null}

      {editor.conflict ? (
        <ConflictDialog
          editor={editor}
          revision={editor.conflict.server.revision}
        />
      ) : null}
    </div>
  );
};
