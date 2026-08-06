import type { Extension } from '@codemirror/state';
import type { AssetDto } from '@grey-flowers/contracts';

import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { syntaxHighlighting } from '@codemirror/language';
import { searchKeymap } from '@codemirror/search';
import { EditorView, keymap } from '@codemirror/view';
import CodeMirror from '@uiw/react-codemirror';
import { RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { apiClient } from '@/app/api/index.js';
import { useDialog } from '@/hooks/use-dialog.js';
import { useKeyboardInset } from '@/hooks/use-keyboard-inset.js';
import { isUrl } from '@/lib/url.js';
import { Alert, Button } from '@/ui/index.js';

import { AssetPickerDialog } from './asset-picker.js';
import { EditorToolbar } from './editor-toolbar.js';
import { ImageAltDialog } from './image-alt-dialog.js';
import { ImageViewerDialog } from './image-viewer-dialog.js';
import {
  imageActions,
  insertUpload,
  livePreview,
  removeImage,
  removeUpload,
  rewriteImageAlt,
  updateUpload,
} from './live-preview/index.js';
import {
  altForAsset,
  altForFile,
  insertInline,
  isInsideCode,
  wrapSelection,
  wrappedMarkdown,
} from './markdown-ops.js';
import { paperHighlight } from './paper-highlight.js';
import { paperTheme } from './paper-theme.js';

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
  const viewerDialog = useDialog<{
    src: string;
    alt: string;
    assetId: string | null;
  }>();
  const altDialog = useDialog<{ src: string; alt: string }>();
  const [altDraft, setAltDraft] = useState('');
  const keyboardInset = useKeyboardInset();

  // 把图片动作安装到模块级 imageActions 槽位；两个 dialog store 只在开/关时
  // 变化，借此重装 handler，闭包始终最新（open 本身无状态，重装足够轻）。
  useEffect(() => {
    imageActions.current = {
      open: (src, alt, assetId) => viewerDialog.open({ src, alt, assetId }),
      edit: (src, alt) => {
        altDialog.open({ src, alt });
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
  }, [altDialog, viewerDialog]);

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

  const saveAlt = () => {
    const target = altDialog.data;
    if (!target) return;
    const view = viewRef.current;
    if (view) rewriteImageAlt(view, target.src, altDraft);
    altDialog.dismiss();
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-paper">
      <EditorToolbar
        keyboardInset={keyboardInset}
        onOpenPicker={() => setPickerOpen(true)}
        onRun={runCommand}
      />

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

      <ImageViewerDialog
        onClose={viewerDialog.dismiss}
        onExited={viewerDialog.clear}
        open={viewerDialog.isOpen}
        viewer={viewerDialog.data}
      />

      <ImageAltDialog
        draft={altDraft}
        onClose={altDialog.dismiss}
        onDraftChange={setAltDraft}
        onExited={altDialog.clear}
        onSave={saveAlt}
        open={altDialog.isOpen}
        target={altDialog.data}
      />
    </div>
  );
};
