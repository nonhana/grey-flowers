import type { Text } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import type { AssetDto } from '@grey-flowers/contracts';

import { syntaxTree } from '@codemirror/language';

export const isInsideCode = (
  view: Pick<EditorView, 'state'>,
  position: number,
) => syntaxTree(view.state).resolveInner(position).name.includes('Code');

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

// 块级内容必须独占段落，即空行
export const blockInsertChange = (doc: Text, head: number, text: string) => {
  const line = doc.lineAt(head);
  const isBlank = line.text.trim() === '';
  const previous = line.number > 1 ? doc.line(line.number - 1).text.trim() : '';
  const nextIsBlankLine =
    line.number < doc.lines && doc.line(line.number + 1).text.trim() === '';

  const prefix = isBlank ? (previous === '' ? '' : '\n') : '\n\n';
  const suffix = nextIsBlankLine ? '' : '\n';
  const insert = `${prefix}${text}${suffix}`;
  const from = isBlank ? line.from : line.to;

  return {
    from,
    to: line.to,
    insert,
    cursor: from + insert.length + (nextIsBlankLine ? 1 : 0),
  };
};

export const insertBlock = (view: EditorView, text: string) => {
  const { cursor, ...changes } = blockInsertChange(
    view.state.doc,
    view.state.selection.main.head,
    text,
  );
  view.dispatch({ changes, selection: { anchor: cursor } });
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
