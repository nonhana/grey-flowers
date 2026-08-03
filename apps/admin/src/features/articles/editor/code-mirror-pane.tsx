import type { Extension } from '@codemirror/state';
import type { AssetDto } from '@grey-flowers/contracts';

import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import {
  HighlightStyle,
  syntaxHighlighting,
  syntaxTree,
} from '@codemirror/language';
import { searchKeymap } from '@codemirror/search';
import { EditorView, keymap } from '@codemirror/view';
import { tags } from '@lezer/highlight';
import CodeMirror from '@uiw/react-codemirror';
import { cn } from 'cnfast';
import {
  Bold,
  Code2,
  ExternalLink,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  RotateCcw,
  Table2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { apiClient } from '@/app/api/index.js';
import { useKeyboardInset } from '@/hooks/use-keyboard-inset.js';
import {
  Alert,
  AppDialog,
  Button,
  controlClass,
  IconButton,
} from '@/ui/index.js';

import { AssetPickerDialog } from './asset-picker.js';
import {
  imageActions,
  insertUpload,
  livePreview,
  removeImage,
  removeUpload,
  rewriteImageAlt,
  updateUpload,
} from './live-preview.js';

/**
 * 纸面。
 *
 * 这里刻意没有行号：行号是代码编辑器的度量，写文章时它只是把视线
 * 从第一个字往右推了三格。行宽锁在 68ch，字号 17px、行高 1.9，
 * 底部留 45vh 让最后一行也能滚到视线中央。
 */
const paperTheme = EditorView.theme({
  '&': {
    backgroundColor: 'var(--color-paper)',
    color: 'var(--color-ink)',
    height: '100%',
  },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': {
    fontFamily: 'var(--font-sans)',
    lineHeight: '1.9',
    overflowY: 'auto',
  },
  '.cm-content': {
    boxSizing: 'border-box',
    caretColor: 'var(--color-accent)',
    fontSize: '17px',
    marginInline: 'auto',
    maxWidth: '72ch',
    minHeight: '100%',
    overflowWrap: 'break-word',
    padding: '2.25rem 1.25rem 45vh',
    wordBreak: 'break-word',
  },
  '.cm-line': { padding: '0' },
  '.cm-activeLine': { backgroundColor: 'transparent' },
  '.cm-selectionBackground': { background: 'var(--color-accent-wash)' },
  '&.cm-focused .cm-selectionBackground': {
    background: 'var(--color-accent-wash)',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: 'var(--color-accent)',
    borderLeftWidth: '2px',
  },
  '.cm-placeholder': { color: 'var(--color-ink-dim)' },

  /* 所见即所得层：图片、上传幽灵、块级观感、链接 */
  '& .gf-live-img': {
    display: 'inline-flex',
    alignItems: 'center',
    verticalAlign: 'middle',
    position: 'relative',
    margin: '0.2em 0.15em 0.2em 0',
    maxWidth: '100%',
    lineHeight: '0',
  },
  '& .gf-live-img-thumb': {
    display: 'block',
    maxWidth: 'min(100%, 560px)',
    maxHeight: '260px',
    objectFit: 'contain',
    borderRadius: '6px',
    border: '1px solid var(--color-edge)',
    background: 'var(--color-well)',
    cursor: 'zoom-in',
  },
  '& .gf-live-img-bar': {
    position: 'absolute',
    top: '4px',
    right: '4px',
    display: 'flex',
    gap: '4px',
    opacity: '0',
    transition: 'opacity 120ms ease',
    lineHeight: 'normal',
  },
  '& .gf-live-img:hover .gf-live-img-bar': { opacity: '1' },
  '& .gf-live-img-act': {
    minHeight: '28px',
    border: 'none',
    borderRadius: '5px',
    padding: '0 8px',
    background: 'var(--color-case-raised)',
    color: 'var(--color-ink-strong)',
    fontFamily: 'var(--font-sans)',
    fontSize: '13px',
    lineHeight: '28px',
    cursor: 'pointer',
    boxShadow: '0 1px 4px rgb(0 0 0 / 0.18)',
  },
  '& .gf-live-img-act:hover': { background: 'var(--color-accent-wash)' },
  '& .gf-live-ghost': {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    verticalAlign: 'middle',
    padding: '5px 8px',
    border: '1px dashed var(--color-edge)',
    borderRadius: '6px',
    background: 'var(--color-well)',
    margin: '0.2em 0.15em',
    lineHeight: 'normal',
  },
  '& .gf-live-ghost-img': {
    width: '96px',
    maxHeight: '64px',
    objectFit: 'cover',
    borderRadius: '4px',
    opacity: '0.7',
  },
  '& .gf-live-ghost-meta': {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.8em',
    color: 'var(--color-ink-dim)',
  },
  '& .cm-line.gf-live-bq': {
    borderLeft: '2px solid var(--color-accent-text)',
    paddingLeft: '0.75rem',
    background: 'var(--color-accent-wash)',
    borderRadius: '0 4px 4px 0',
  },
  '& .cm-line.gf-live-table': {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.9em',
  },
  '& .cm-line.gf-live-code': {
    background: 'var(--color-well)',
    borderLeft: '2px solid var(--color-edge)',
  },
  '& .gf-live-link': {
    cursor: 'pointer',
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
    textDecorationColor:
      'color-mix(in srgb, var(--color-accent-text) 45%, transparent)',
  },
});

/**
 * 克制的语法着色：标题靠字号和字重，强调靠字重和字形，
 * 只有链接和列表符号动用强调蓝。没有第二个色系。
 */
const paperHighlight = HighlightStyle.define([
  {
    tag: tags.heading1,
    color: 'var(--color-ink-strong)',
    fontSize: '1.4em',
    fontWeight: '700',
  },
  {
    tag: tags.heading2,
    color: 'var(--color-ink-strong)',
    fontSize: '1.22em',
    fontWeight: '700',
  },
  {
    tag: tags.heading3,
    color: 'var(--color-ink-strong)',
    fontSize: '1.1em',
    fontWeight: '700',
  },
  {
    tag: [tags.heading4, tags.heading5, tags.heading6],
    color: 'var(--color-ink-strong)',
    fontWeight: '700',
  },
  { tag: tags.strong, color: 'var(--color-ink-strong)', fontWeight: '700' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  {
    tag: tags.strikethrough,
    color: 'var(--color-ink-dim)',
    textDecoration: 'line-through',
  },
  { tag: [tags.link, tags.url], color: 'var(--color-accent-text)' },
  { tag: tags.quote, color: 'var(--color-ink-dim)', fontStyle: 'italic' },
  {
    tag: tags.monospace,
    fontFamily: 'var(--font-mono)',
    fontSize: '0.9em',
  },
  { tag: tags.list, color: 'var(--color-accent-text)' },
  { tag: tags.contentSeparator, color: 'var(--color-ink-dim)' },
  // Markdown 的 # ** ` 这些记号本身，压到最淡，让内容浮出来。
  { tag: tags.processingInstruction, color: 'var(--color-ink-dim)' },
]);

const isUrl = (value: string) => {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const isInsideCode = (view: EditorView, position: number) =>
  syntaxTree(view.state).resolveInner(position).name.includes('Code');

const wrappedMarkdown = (asset: AssetDto, alt: string) =>
  `![${alt}](${asset.deliveryUrl}){asset-id=${asset.id}}`;

const altForFile = (file: File) => file.name.replace(/\.[^.]+$/, '') || '图片';

const altForAsset = (asset: AssetDto) =>
  (asset.storageKey.split('/').pop() ?? '图片').replace(/\.[^.]+$/, '');

const wrapSelection = (view: EditorView, before: string, after: string) => {
  const selection = view.state.selection.main;
  const selected = view.state.sliceDoc(selection.from, selection.to);
  const content = selected || '文本';
  view.dispatch({
    changes: {
      from: selection.from,
      insert: `${before}${content}${after}`,
      to: selection.to,
    },
    selection: {
      anchor: selection.from + before.length + content.length + after.length,
    },
  });
  view.focus();
};

const insertInline = (view: EditorView, text: string) => {
  const selection = view.state.selection.main;
  view.dispatch({
    changes: { from: selection.from, insert: text, to: selection.to },
    selection: { anchor: selection.from + text.length },
  });
  view.focus();
};

const prefixLine = (view: EditorView, prefix: string) => {
  const selection = view.state.selection.main;
  const line = view.state.doc.lineAt(selection.head);
  view.dispatch({
    changes: { from: line.from, insert: prefix },
    selection: { anchor: selection.head + prefix.length },
  });
  view.focus();
};

const lineWrappedMarkdown = (view: EditorView, open: string, close: string) => {
  const selection = view.state.selection.main;
  const from = view.state.doc.lineAt(selection.from).from;
  const to = view.state.doc.lineAt(selection.to).to;
  view.dispatch({
    changes: {
      from,
      insert: `${open}\n${view.state.sliceDoc(from, to)}\n${close}`,
      to,
    },
  });
  view.focus();
};

const TOOLBAR_BUTTONS = [
  {
    icon: Heading2,
    label: '二级标题',
    run: (v: EditorView) => prefixLine(v, '## '),
  },
  {
    icon: Heading3,
    label: '三级标题',
    run: (v: EditorView) => prefixLine(v, '### '),
  },
  {
    icon: Bold,
    label: '加粗',
    run: (v: EditorView) => wrapSelection(v, '**', '**'),
  },
  {
    icon: Italic,
    label: '斜体',
    run: (v: EditorView) => wrapSelection(v, '*', '*'),
  },
  {
    icon: Link2,
    label: '链接',
    run: (v: EditorView) => wrapSelection(v, '[', '](https://)'),
  },
  {
    icon: List,
    label: '无序列表',
    run: (v: EditorView) => prefixLine(v, '- '),
  },
  {
    icon: ListOrdered,
    label: '有序列表',
    run: (v: EditorView) => prefixLine(v, '1. '),
  },
  { icon: Quote, label: '引用', run: (v: EditorView) => prefixLine(v, '> ') },
  {
    icon: Code2,
    label: '代码块',
    run: (v: EditorView) => lineWrappedMarkdown(v, '```ts', '```'),
  },
  {
    icon: Table2,
    label: '表格',
    run: (v: EditorView) =>
      insertInline(v, '| 列1 | 列2 |\n| --- | --- |\n|  |  |\n'),
  },
] as const;

export const CodeMirrorPane = ({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) => {
  const viewRef = useRef<EditorView | null>(null);
  const [failedFiles, setFailedFiles] = useState<File[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [viewer, setViewer] = useState<{
    src: string;
    alt: string;
    assetId: string | null;
  } | null>(null);
  const [editTarget, setEditTarget] = useState<{
    src: string;
    alt: string;
  } | null>(null);
  const [altDraft, setAltDraft] = useState('');
  const keyboardInset = useKeyboardInset();

  useEffect(() => {
    imageActions.current = {
      open: (src, alt, assetId) => setViewer({ src, alt, assetId }),
      edit: (src, alt) => {
        setEditTarget({ src, alt });
        setAltDraft(alt);
      },
      remove: (src, anchor) => {
        const view = viewRef.current;
        if (view) removeImage(view, src, anchor);
      },
    };
    return () => {
      imageActions.current = null;
    };
  }, []);

  /**
   * 上传不写进文档（幽灵占位是 UI-only，不参与自动保存），成功后才把
   * `![alt](deliveryUrl){asset-id=N}` 插进正文、撤掉幽灵。
   */
  const uploadImages = (
    files: File[],
    target: EditorView | null,
    at?: number,
  ) => {
    const view = target;
    if (!view) return;
    files.forEach((file) => {
      const id = crypto.randomUUID();
      const insertAt = at ?? view?.state.selection.main.head ?? 0;
      const objectUrl = URL.createObjectURL(file);
      setFailedFiles((current) => current.filter((item) => item !== file));
      view?.dispatch({
        effects: insertUpload.of({
          id,
          insertAt,
          objectUrl,
          progress: 0,
          file,
        }),
      });
      void apiClient.assets
        .upload({ file, purpose: 'ARTICLE_INLINE' }, (progress) =>
          view?.dispatch({ effects: updateUpload.of({ id, progress }) }),
        )
        .then((asset) => {
          view?.dispatch({
            changes: {
              from: Math.min(insertAt, view.state.doc.length),
              insert: wrappedMarkdown(asset, altForFile(file)),
            },
            effects: removeUpload.of(id),
          });
        })
        .catch(() => {
          view?.dispatch({ effects: removeUpload.of(id) });
          setFailedFiles((current) => [...current, file]);
        })
        .finally(() => URL.revokeObjectURL(objectUrl));
    });
  };

  const extensions: Extension[] = [
    EditorView.lineWrapping,
    history(),
    // 用 GFM base：表格才被解析成 Table 节点，块级观感类才套得上；
    // 与主站 @nuxtjs/mdc 的表格渲染语义一致。
    markdown({ base: markdownLanguage }),
    syntaxHighlighting(paperHighlight, { fallback: true }),
    keymap.of([
      ...defaultKeymap,
      ...historyKeymap,
      ...searchKeymap,
      indentWithTab,
    ]),
    paperTheme,
    ...livePreview(),
    EditorView.domEventHandlers({
      drop: (event, view) => {
        const images = Array.from(event.dataTransfer?.files ?? []).filter(
          (file) => file.type.startsWith('image/'),
        );
        if (images.length === 0) return false;
        event.preventDefault();
        uploadImages(
          images,
          view,
          view.posAtCoords({ x: event.clientX, y: event.clientY }) ?? undefined,
        );
        return true;
      },
      paste: (event, view) => {
        const images = Array.from(event.clipboardData?.files ?? []).filter(
          (file) =>
            file.type.startsWith('image/') ||
            /\.(png|jpe?g|gif|webp)$/i.test(file.name),
        );
        if (images.length > 0) {
          event.preventDefault();
          uploadImages(images, view);
          return true;
        }

        const text = event.clipboardData?.getData('text/plain');
        if (text && isUrl(text)) {
          const selection = view.state.selection.main;
          const selected = view.state.sliceDoc(selection.from, selection.to);
          if (selected && !isInsideCode(view, selection.from)) {
            event.preventDefault();
            wrapSelection(view, '[', `](${text.trim()})`);
            return true;
          }
        }
        return false;
      },
    }),
  ];

  const runCommand = (run: (view: EditorView) => void) => {
    const view = viewRef.current;
    if (view) run(view);
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-paper">
      {/*
        工具条在桌面端是编辑区的顶栏，在移动端吸底并跟随软键盘上移 ——
        打字时拇指够不到的顶部工具条等于没有工具条。
      */}
      <div
        aria-label="Markdown 插入工具"
        className={cn(
          'z-30 gf-scroll-x flex items-center gap-0.5 bg-case px-1.5',
          // 字盘压在纸上的那道边用投影而不是描边：纸是抬升面，不该被线切开。
          'fixed inset-x-0 bottom-0 py-1.5 shadow-case-up',
          'pb-[max(0.375rem,env(safe-area-inset-bottom))]',
          'md:relative md:pb-1.5 md:shadow-case-down',
        )}
        role="toolbar"
        style={
          keyboardInset > 0
            ? { transform: `translateY(-${String(keyboardInset)}px)` }
            : undefined
        }
      >
        {TOOLBAR_BUTTONS.map((button) => (
          <IconButton
            key={button.label}
            label={button.label}
            onPress={() => runCommand(button.run)}
            size="md"
          >
            <button.icon aria-hidden="true" />
          </IconButton>
        ))}
        <span aria-hidden="true" className="mx-1 h-5 w-px shrink-0 bg-rule" />
        <IconButton
          label="从资产库插入图片"
          onPress={() => setPickerOpen(true)}
          size="md"
        >
          <ImagePlus aria-hidden="true" />
        </IconButton>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden bg-paper">
        {/*
          theme="none" 是必须的：默认的 "light" 会注入一条写死的
          backgroundColor: #fff，暗色下把纸面刷成白的，正文变成
          浅灰压白。纸面的明暗全部交给 paperTheme 里的 --color-paper。
        */}
        <CodeMirror
          basicSetup={false}
          className="h-full text-left"
          extensions={extensions}
          onChange={onChange}
          onCreateEditor={(view) => {
            viewRef.current = view;
          }}
          placeholder="从这里开始写。粘贴或拖入图片会直接上传并插入。"
          theme="none"
          value={value}
        />
      </div>

      {failedFiles.length > 0 ? (
        <Alert
          action={
            <Button
              icon={<RotateCcw aria-hidden="true" />}
              onPress={() => uploadImages([...failedFiles], viewRef.current)}
              size="sm"
            >
              重试
            </Button>
          }
          className="rounded-none border-x-0 border-b-0"
        >
          {failedFiles.length} 张图片没能上传。
        </Alert>
      ) : null}

      <AssetPickerDialog
        onClose={() => setPickerOpen(false)}
        onSelect={(asset: AssetDto) => {
          const view = viewRef.current;
          if (view)
            insertInline(view, wrappedMarkdown(asset, altForAsset(asset)));
          setPickerOpen(false);
        }}
        open={pickerOpen}
        purpose="ARTICLE_INLINE"
        title="选择正文图片"
      />

      <AppDialog
        isOpen={viewer !== null}
        onOpenChange={(open) => {
          if (!open) setViewer(null);
        }}
        size="lg"
        title={viewer?.alt || '正文图片'}
      >
        {viewer ? (
          <div className="grid gap-3">
            {viewer.assetId ? (
              <p className="font-mono text-2xs text-ink-dim">
                受管资产 · id {viewer.assetId}
              </p>
            ) : null}
            <img
              alt={viewer.alt || '正文图片'}
              className="max-h-[70dvh] w-full rounded-sheet object-contain"
              src={viewer.src}
            />
            <div className="flex justify-end">
              <Button
                icon={<ExternalLink aria-hidden="true" />}
                onPress={() => window.open(viewer.src, '_blank', 'noopener')}
                size="sm"
                tone="ghost"
              >
                在新标签打开原图
              </Button>
            </div>
          </div>
        ) : null}
      </AppDialog>

      <AppDialog
        isOpen={editTarget !== null}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
        size="sm"
        title="编辑图片替代文字"
      >
        {editTarget ? (
          <div className="grid gap-4">
            <label className="grid gap-1.5">
              <span className="text-sm text-ink-dim">alt</span>
              <input
                className={cn(controlClass, 'font-sans text-base')}
                onChange={(event) => setAltDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    const view = viewRef.current;
                    if (view) rewriteImageAlt(view, editTarget.src, altDraft);
                    setEditTarget(null);
                  }
                }}
                value={altDraft}
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button onPress={() => setEditTarget(null)} tone="quiet">
                取消
              </Button>
              <Button
                onPress={() => {
                  const view = viewRef.current;
                  if (view) rewriteImageAlt(view, editTarget.src, altDraft);
                  setEditTarget(null);
                }}
                tone="solid"
              >
                保存
              </Button>
            </div>
          </div>
        ) : null}
      </AppDialog>
    </div>
  );
};
