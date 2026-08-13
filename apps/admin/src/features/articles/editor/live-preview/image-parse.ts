import type { EditorView } from '@codemirror/view';

import { syntaxTree } from '@codemirror/language';

export const ASSET_ID_TAIL = /^\{asset-id=(\d+)\}/;

const INLINE_IMAGE = /^!\[([\s\S]*?)\]\(\s*([^)\s]+(?:\s+["'][^)]*)?)\)/;

/** `{asset-id=N}` 尾巴不在 Image 节点内：把这段并进装饰范围。 */
export function imageCover(view: EditorView, from: number, to: number) {
  const tail = view.state.sliceDoc(to, to + 30);
  const match = ASSET_ID_TAIL.exec(tail);
  return match ? { from, to: to + match[0].length } : { from, to };
}

export function parseImage(view: EditorView, from: number, to: number) {
  const text = view.state.sliceDoc(from, to);
  const match = INLINE_IMAGE.exec(text);
  if (!match) return null;
  return { alt: match[1] ?? '', src: match[2] ?? '' };
}

/** 图片是否落在代码语境里（理论上 Image 不会被 CodeText 解析出来，双保险）。 */
export function imageInCode(
  view: EditorView,
  node: { from: number; to: number },
) {
  let current = syntaxTree(view.state).resolveInner(node.from).parent;
  while (current) {
    if (current.name === 'FencedCode' || current.name === 'InlineCode') {
      return true;
    }
    current = current.parent;
  }
  return false;
}
