import type { EditorView } from '@codemirror/view';
import type { AssetDto } from '@grey-flowers/contracts';

import { syntaxTree } from '@codemirror/language';

export const isInsideCode = (view: EditorView, position: number) =>
  syntaxTree(view.state).resolveInner(position).name.includes('Code');

export const wrappedMarkdown = (asset: AssetDto, alt: string) =>
  `![${alt}](${asset.deliveryUrl}){asset-id=${asset.id}}`;

export const altForFile = (file: File) =>
  file.name.replace(/\.[^.]+$/, '') || '图片';

export const altForAsset = (asset: AssetDto) =>
  (asset.storageKey.split('/').pop() ?? '图片').replace(/\.[^.]+$/, '');

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

export const insertInline = (view: EditorView, text: string) => {
  const selection = view.state.selection.main;
  view.dispatch({
    changes: { from: selection.from, insert: text, to: selection.to },
    selection: { anchor: selection.from + text.length },
  });
  view.focus();
};

export const prefixLine = (view: EditorView, prefix: string) => {
  const selection = view.state.selection.main;
  const line = view.state.doc.lineAt(selection.head);
  view.dispatch({
    changes: { from: line.from, insert: prefix },
    selection: { anchor: selection.head + prefix.length },
  });
  view.focus();
};

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
