import type { EditorView } from '@codemirror/view';
import type { SyntaxNode } from '@lezer/common';

import { syntaxTree } from '@codemirror/language';

import { imageCover, parseImage } from './image-parse.js';

interface LocatedImage {
  from: number;
  to: number;
  altFrom: number;
  altTo: number;
}

function locateImage(view: EditorView, from: number, to: number): LocatedImage {
  const { alt } = parseImage(view, from, to) ?? { alt: '' };
  const { from: coveredFrom, to: coveredTo } = imageCover(view, from, to);
  return {
    from: coveredFrom,
    to: coveredTo,
    altFrom: from + 2,
    altTo: from + 2 + alt.length,
  };
}

function findImage(view: EditorView, src: string, anchor: number) {
  const tree = syntaxTree(view.state);
  // 优先按锚点找回原节点（位置会随编辑漂移，用 resolve 重新定位）
  const atAnchor: SyntaxNode | null = tree.resolveInner(
    Math.min(anchor, view.state.doc.length),
  );
  let current: SyntaxNode | null = atAnchor;
  while (current && current.name !== 'Image') current = current.parent;
  if (current && view.state.sliceDoc(current.from, current.to).includes(src)) {
    return locateImage(view, current.from, current.to);
  }

  let located: LocatedImage | null = null;
  tree.iterate({
    enter: (node) => {
      if (node.name !== 'Image') return undefined;
      if (view.state.sliceDoc(node.from, node.to).includes(src)) {
        located = locateImage(view, node.from, node.to);
        return false;
      }
      return undefined;
    },
  });
  return located;
}

/** 重写某张图片的 alt。 */
export function rewriteImageAlt(view: EditorView, src: string, alt: string) {
  const found = findImage(view, src, 0);
  if (!found) return;
  view.dispatch({
    changes: { from: found.altFrom, to: found.altTo, insert: alt },
  });
}

/** 删除某张图片（连同 `{asset-id}` 尾巴）。 */
export function removeImage(view: EditorView, src: string, anchor: number) {
  const found = findImage(view, src, anchor);
  if (!found) return;
  view.dispatch({ changes: { from: found.from, to: found.to, insert: '' } });
}
