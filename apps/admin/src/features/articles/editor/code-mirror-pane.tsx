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
  defaultHighlightStyle,
  syntaxHighlighting,
  syntaxTree,
} from '@codemirror/language';
import { searchKeymap } from '@codemirror/search';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import CodeMirror from '@uiw/react-codemirror';
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
  Loader2,
  Quote,
  RotateCcw,
  Table2,
} from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Button } from 'react-aria-components';

import { apiClient } from '../../../app/api/index.js';
import { AssetPickerDialog } from './asset-picker.js';

const editorTheme = EditorView.theme({
  '&': {
    backgroundColor: 'transparent',
    color: 'var(--color-ink)',
    height: '100%',
  },
  '&.cm-focused': { outline: 'none' },
  '.cm-content': {
    caretColor: 'var(--color-brand)',
    fontFamily: "'Noto Serif SC', 'Noto Serif', serif",
    fontSize: '16px',
    lineHeight: '1.9',
    minHeight: '100%',
    minWidth: '0',
    overflowWrap: 'break-word',
    padding: '20px 24px 40vh',
    wordBreak: 'break-word',
  },
  '.cm-line': { padding: '0 2px' },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--color-ink-faint)',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '12px',
  },
  '.cm-activeLine': { backgroundColor: 'transparent' },
  '.cm-activeLineGutter': { backgroundColor: 'transparent' },
  '.cm-selectionBackground': { background: 'var(--color-focus-ring)' },
  '&.cm-focused .cm-selectionBackground': {
    background: 'var(--color-focus-ring)',
  },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--color-brand)' },
  '.cm-placeholder': { color: 'var(--color-input-placeholder)' },
});

const isUrl = (value: string) => {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const isInsideCode = (view: EditorView, position: number) => {
  const node = syntaxTree(view.state).resolveInner(position);
  return node.name.includes('Code');
};

const wrappedMarkdown = (asset: AssetDto, alt: string) => {
  return `![${alt}](${asset.deliveryUrl}){asset-id=${asset.id}}`;
};

const altForFile = (file: File) => {
  return file.name.replace(/\.[^.]+$/, '') || '图片';
};

const altForAsset = (asset: AssetDto) => {
  return (asset.storageKey.split('/').pop() ?? '图片').replace(/\.[^.]+$/, '');
};

const wrapSelection = (view: EditorView, before: string, after: string) => {
  const selection = view.state.selection.main;
  const selected = view.state.sliceDoc(selection.from, selection.to);
  const content = selected || '文本';
  view.dispatch({
    changes: {
      from: selection.from,
      to: selection.to,
      insert: `${before}${content}${after}`,
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
    changes: { from: selection.from, to: selection.to, insert: text },
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
      to,
      insert: `${open}\n${view.state.sliceDoc(from, to)}\n${close}`,
    },
  });
  view.focus();
};

interface ToolbarButton {
  label: string;
  icon: typeof Bold;
  run: (view: EditorView) => void;
}

const TOOLBAR_BUTTONS: ToolbarButton[] = [
  { label: 'H2', icon: Heading2, run: (view) => prefixLine(view, '## ') },
  { label: 'H3', icon: Heading3, run: (view) => prefixLine(view, '### ') },
  { label: 'B', icon: Bold, run: (view) => wrapSelection(view, '**', '**') },
  { label: 'I', icon: Italic, run: (view) => wrapSelection(view, '*', '*') },
  {
    label: '链接',
    icon: Link2,
    run: (view) => wrapSelection(view, '[', '](https://)'),
  },
  { label: '列表', icon: List, run: (view) => prefixLine(view, '- ') },
  {
    label: '有序列表',
    icon: ListOrdered,
    run: (view) => prefixLine(view, '1. '),
  },
  { label: '引用', icon: Quote, run: (view) => prefixLine(view, '> ') },
  {
    label: '代码块',
    icon: Code2,
    run: (view) => lineWrappedMarkdown(view, '```ts', '```'),
  },
  {
    label: '表格',
    icon: Table2,
    run: (view) =>
      insertInline(view, '| 列1 | 列2 |\n| --- | --- |\n|  |  |\n'),
  },
];

interface PendingUpload {
  file: File;
  progress: number;
}

interface CodeMirrorPaneProps {
  onChange: (value: string) => void;
  value: string;
}

export const CodeMirrorPane = ({ onChange, value }: CodeMirrorPaneProps) => {
  const viewRef = useRef<EditorView | null>(null);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [failedFiles, setFailedFiles] = useState<File[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const uploadImages = useCallback(
    (files: File[], view: EditorView | null = null) => {
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
    },
    [],
  );

  const pickerExtension = useMemo<Extension>(
    () =>
      EditorView.domEventHandlers({
        paste: (event, view) => {
          const files = Array.from(event.clipboardData?.files ?? []);
          const images = files.filter(
            (file) =>
              file.type.startsWith('image/') ||
              /\.(png|jpe?g|gif|webp)$/i.test(file.name),
          );
          if (images.length > 0) {
            event.preventDefault();
            void uploadImages(images, view);
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
        drop: (event, view) => {
          const files = Array.from(event.dataTransfer?.files ?? []);
          const images = files.filter(
            (file) =>
              file.type.startsWith('image/') ||
              /\\.(png|jpe?g|gif|webp)$/i.test(file.name),
          );
          if (images.length > 0) {
            event.preventDefault();
            void uploadImages(images, view);
            return true;
          }
          return false;
        },
      }),
    [uploadImages],
  );

  const extensions = useMemo<Extension[]>(
    () => [
      lineNumbers(),
      EditorView.lineWrapping,
      history(),
      markdown(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        ...searchKeymap,
        indentWithTab,
      ]),
      editorTheme,
      pickerExtension,
    ],
    [pickerExtension],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        aria-label="Markdown 插入工具"
        className="
          flex flex-wrap items-center gap-1 border-b border-edge bg-surface px-2
          py-1.5
        "
        role="toolbar"
      >
        {TOOLBAR_BUTTONS.map((button) => (
          <Button
            aria-label={button.label}
            className="
              grid size-10.5 place-items-center rounded-control text-ink-soft
              transition-colors
              hover:bg-accent hover:text-accent-text
              focus-visible:outline-[3px] focus-visible:outline-offset-2
              focus-visible:outline-focus-outline
              [&_svg]:size-4.5
            "
            key={button.label}
            onPress={() => {
              const view = viewRef.current;
              if (view) button.run(view);
            }}
          >
            <button.icon aria-hidden="true" />
          </Button>
        ))}
        <Button
          aria-label="从资产库插入图片"
          className="
            grid size-10.5 place-items-center rounded-control text-ink-soft
            transition-colors
            hover:bg-accent hover:text-accent-text
            focus-visible:outline-[3px] focus-visible:outline-offset-2
            focus-visible:outline-focus-outline
            [&_svg]:size-4.5
          "
          onPress={() => setPickerOpen(true)}
        >
          <ImagePlus aria-hidden="true" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto bg-canvas">
        <CodeMirror
          className="h-full text-left"
          extensions={extensions}
          onCreateEditor={(view) => {
            viewRef.current = view;
          }}
          onChange={onChange}
          value={value}
        />
      </div>

      {pendingUploads.length > 0 ? (
        <div
          aria-live="polite"
          className="
            flex items-center gap-2 border-t border-edge bg-surface px-4 py-2
            font-mono text-[0.76rem] text-ink-soft
          "
        >
          <Loader2 aria-hidden="true" className="animate-spin" />
          <span>
            {pendingUploads
              .map(
                (item) =>
                  `${item.file.name} ${Math.round(item.progress * 100)}%`,
              )
              .join(' · ')}
          </span>
        </div>
      ) : null}

      {failedFiles.length > 0 ? (
        <div
          className="
            flex items-center justify-between gap-2 border-t border-edge
            bg-danger-soft px-4 py-2 text-[0.82rem] text-danger-ink
          "
          role="alert"
        >
          <span>图片上传失败，点击重试。</span>
          <Button
            className="
              flex min-h-9 items-center gap-1 rounded-control border
              border-danger-edge px-2.5 font-mono text-[0.76rem]
            "
            onPress={() => {
              void uploadImages([...failedFiles], viewRef.current);
            }}
          >
            <RotateCcw aria-hidden="true" />
            重试
          </Button>
        </div>
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
