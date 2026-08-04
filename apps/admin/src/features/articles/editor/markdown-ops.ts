import type { EditorView } from '@codemirror/view';
import type { AssetDto } from '@grey-flowers/contracts';

import { syntaxTree } from '@codemirror/language';

/** 光标是否落在代码语境里。 */
export const isInsideCode = (view: EditorView, position: number) =>
  syntaxTree(view.state).resolveInner(position).name.includes('Code');

/** 受管资产的正文 Markdown（带 `{asset-id=N}` 尾巴）。 */
export const wrappedMarkdown = (asset: AssetDto, alt: string) =>
  `![${alt}](${asset.deliveryUrl}){asset-id=${asset.id}}`;

/** 本地文件名的 alt（去掉扩展名）。 */
export const altForFile = (file: File) =>
  file.name.replace(/\.[^.]+$/, '') || '图片';

/** 资产 storageKey 的 alt（取最末段并去掉扩展名）。 */
export const altForAsset = (asset: AssetDto) =>
  (asset.storageKey.split('/').pop() ?? '图片').replace(/\.[^.]+$/, '');

/** 用前后缀包裹当前选区；无选区时插入占位「文本」。 */
export const wrapSelection = (
  view: EditorView,
  before: string,
  after: string,
) => {
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

/** 在光标处插入文本并落到其末尾。 */
export const insertInline = (view: EditorView, text: string) => {
  const selection = view.state.selection.main;
  view.dispatch({
    changes: { from: selection.from, insert: text, to: selection.to },
    selection: { anchor: selection.from + text.length },
  });
  view.focus();
};

/** 在光标所在行首插入前缀（标题 / 列表 / 引用）。 */
export const prefixLine = (view: EditorView, prefix: string) => {
  const selection = view.state.selection.main;
  const line = view.state.doc.lineAt(selection.head);
  view.dispatch({
    changes: { from: line.from, insert: prefix },
    selection: { anchor: selection.head + prefix.length },
  });
  view.focus();
};

/** 用 `open`/`close` 两行包裹选区整行（代码块等围栏）。 */
export const lineWrappedMarkdown = (
  view: EditorView,
  open: string,
  close: string,
) => {
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
