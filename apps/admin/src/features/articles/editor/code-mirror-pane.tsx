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
import { cn } from 'cnfast';
import { RotateCcw } from 'lucide-react';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';

import { apiClient } from '@/app/api/index.js';
import { AssetPickerDialog } from '@/features/assets/asset-picker.js';
import { useDialog } from '@/hooks/use-dialog.js';
import { useKeyboardInset } from '@/hooks/use-keyboard-inset.js';
import { IMAGE_ACCEPT_MAP } from '@/lib/media-accept.js';
import { isUrl } from '@/lib/url.js';
import { Button } from '@/ui/button.js';
import { Alert } from '@/ui/feedback.js';

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
  uploadField,
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

  // 把图片动作安装到模块级 imageActions 槽位（L-9）：effect 空依赖、只在
  // 挂载时安装一次；handler 经 useEffectEvent 恒读最新的 dialog store 与
  // viewRef，不再押注 Compiler 记忆化 useDialog 返回对象的引用身份。
  const openViewer = useEffectEvent(
    (src: string, alt: string, assetId: string | null) => {
      viewerDialog.open({ src, alt, assetId });
    },
  );
  const editAlt = useEffectEvent((src: string, alt: string) => {
    altDialog.open({ src, alt });
    setAltDraft(alt);
  });
  const removeImageAt = useEffectEvent((src: string, anchor: number) => {
    const view = viewRef.current;
    if (view) removeImage(view, src, anchor);
  });

  useEffect(() => {
    imageActions.current = {
      open: openViewer,
      edit: editAlt,
      remove: removeImageAt,
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
          if (!view) return;
          // 上传在途期间的输入会平移占位插入点（uploadField 按文档变更重映射），
          // 完成时读 field 里的实时坐标，避免按陈旧 insertAt 插入造成漂移。
          const liveAt =
            view.state
              .field(uploadField, false)
              ?.find((entry) => entry.id === id)?.insertAt ?? insertAt;
          view.dispatch({
            changes: {
              from: Math.min(liveAt, view.state.doc.length),
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

  // 扩展是静态的（交互出口走模块级 imageActions 槽位，闭包用稳定 ref）：
  // 只在挂载时构建一次，避免每次键入触发的重渲染都让 react-codemirror
  // 整体 reconfigure、重建 ViewPlugin/装饰，造成排版抖动与无谓开销。
  const [extensions] = useState<Extension[]>(() => [
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
  ]);

  // 文件拖放统一走 react-dropzone（挂在编辑器外壳上）。drop 事件会先到
  // CodeMirror 内置处理器：它对二进制图片是无害 no-op（按文本读入后被
  // 控制字符过滤成空串），图片上传/插入由这里接手；粘贴仍由 CodeMirror
  // 的 domEventHandlers 处理，所以关掉 dropzone 的 onPaste（noPaste）。
  const { getRootProps, isDragActive } = useDropzone({
    accept: IMAGE_ACCEPT_MAP,
    multiple: true,
    noClick: true,
    noKeyboard: true,
    noPaste: true,
    onDrop: (acceptedFiles, _rejections, event) => {
      const view = viewRef.current;
      if (!view || acceptedFiles.length === 0) return;
      const pos =
        'clientX' in event
          ? view.posAtCoords({ x: event.clientX, y: event.clientY })
          : null;
      uploadImages(acceptedFiles, view, pos ?? undefined);
    },
  });

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

      <div
        {...getRootProps()}
        className={cn(
          'relative min-h-0 flex-1 overflow-hidden bg-paper',
          isDragActive && 'outline-2 -outline-offset-2 outline-focus',
        )}
      >
        {isDragActive ? (
          <div
            className="
              pointer-events-none absolute inset-x-0 top-0 z-10 grid
              place-items-center bg-scrim/40 py-2
            "
          >
            <span
              className="
                rounded-control bg-case-raised px-3 py-1 font-mono text-xs
                text-ink-strong shadow-float
              "
            >
              松开以插入图片
            </span>
          </div>
        ) : null}
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
              icon={<RotateCcw aria-hidden />}
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
