import type { Extension } from '@codemirror/state';
import type { AssetDto } from '@grey-flowers/contracts';

import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
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
import { useRef, useState } from 'react';

import { apiClient } from '@/app/api/index.js';
import { useKeyboardInset } from '@/hooks/use-keyboard-inset.js';
import { Alert, Button, IconButton, Spinner } from '@/ui/index.js';

import { AssetPickerDialog } from './asset-picker.js';

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

interface PendingUpload {
  file: File;
  progress: number;
}

export const CodeMirrorPane = ({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) => {
  const viewRef = useRef<EditorView | null>(null);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [failedFiles, setFailedFiles] = useState<File[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const keyboardInset = useKeyboardInset();

  const uploadImages = (files: File[], view: EditorView | null = null) => {
    void Promise.all(
      files.map(async (file) => {
        setFailedFiles((current) => current.filter((item) => item !== file));
        setPendingUploads((current) => [...current, { file, progress: 0 }]);
        try {
          const asset = await apiClient.assets.upload(
            { file, purpose: 'ARTICLE_INLINE' },
            (progress) =>
              setPendingUploads((current) =>
                current.map((item) =>
                  item.file === file ? { ...item, progress } : item,
                ),
              ),
          );
          if (view)
            insertInline(view, wrappedMarkdown(asset, altForFile(file)));
        } catch {
          setFailedFiles((current) => [...current, file]);
        } finally {
          setPendingUploads((current) =>
            current.filter((item) => item.file !== file),
          );
        }
      }),
    );
  };

  const extensions: Extension[] = [
    EditorView.lineWrapping,
    history(),
    markdown(),
    syntaxHighlighting(paperHighlight, { fallback: true }),
    keymap.of([
      ...defaultKeymap,
      ...historyKeymap,
      ...searchKeymap,
      indentWithTab,
    ]),
    paperTheme,
    EditorView.domEventHandlers({
      drop: (event, view) => {
        const images = Array.from(event.dataTransfer?.files ?? []).filter(
          (file) => file.type.startsWith('image/'),
        );
        if (images.length === 0) return false;
        event.preventDefault();
        uploadImages(images, view);
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

      {pendingUploads.length > 0 ? (
        <div
          aria-live="polite"
          className="border-t border-rule bg-case px-4 py-2"
        >
          <Spinner
            label={pendingUploads
              .map(
                (item) =>
                  `${item.file.name} ${String(Math.round(item.progress * 100))}%`,
              )
              .join(' · ')}
          />
        </div>
      ) : null}

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
    </div>
  );
};
