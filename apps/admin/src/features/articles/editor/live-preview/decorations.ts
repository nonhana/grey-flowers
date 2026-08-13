import type { Range } from '@codemirror/state';
import type { DecorationSet, EditorView, ViewUpdate } from '@codemirror/view';

import { syntaxTree } from '@codemirror/language';
import { Decoration, ViewPlugin } from '@codemirror/view';

import {
  ASSET_ID_TAIL,
  imageCover,
  imageInCode,
  parseImage,
} from './image-parse.js';
import {
  insertUpload,
  removeUpload,
  updateUpload,
  uploadField,
} from './upload-state.js';
import { InlineImageWidget, UploadGhostWidget } from './widgets.js';

/**
 * 装饰层：`Image` 节点整体被 `Decoration.replace` 替换成 `<img>`；
 * `{asset-id=N}` 不在 lezer 的 `Image` 节点内，装饰与删除都要把这段
 * 尾巴一并并入，否则会漏出裸文本。上传占位在插入点渲染幽灵图。
 */
export function blockLineStarts(view: EditorView, from: number, to: number) {
  const doc = view.state.doc;
  const starts: number[] = [];
  if (from >= doc.length) return starts;
  let line = doc.lineAt(Math.min(from, doc.length));
  while (line.from <= to && line.from <= doc.length) {
    starts.push(line.from);
    if (line.to >= to) break;
    const next = doc.lineAt(line.to + 1);
    if (next.from <= line.from) break; // 防御死循环
    line = next;
  }
  return starts;
}

const blockQuoteLine = Decoration.line({ class: 'gf-live-bq' });
const tableLine = Decoration.line({ class: 'gf-live-table' });
const codeLine = Decoration.line({ class: 'gf-live-code' });
const linkMark = Decoration.mark({ class: 'gf-live-link' });

function buildDecorations(view: EditorView): DecorationSet {
  const ranges: Range<Decoration>[] = [];
  const doc = view.state.doc;

  // 上传幽灵占位：插在记录位置，不占文档内容。
  const uploads = view.state.field(uploadField, false);
  if (uploads && uploads.length > 0) {
    let offset = 0;
    for (const item of uploads) {
      const pos = Math.min(item.insertAt + offset, doc.length);
      offset += 1;
      if (pos >= 0) {
        ranges.push(
          Decoration.widget({
            widget: new UploadGhostWidget(item),
            side: 1,
          }).range(pos, pos),
        );
      }
    }
  }

  syntaxTree(view.state).iterate({
    enter: (node) => {
      if (node.name === 'Blockquote' || node.name === 'Table') {
        const cls = node.name === 'Blockquote' ? blockQuoteLine : tableLine;
        for (const start of blockLineStarts(view, node.from, node.to)) {
          ranges.push(cls.range(start, start));
        }
        // 继续下钻：表格里的图片、引用里的链接照常渲染
        return undefined;
      }
      if (node.name === 'FencedCode') {
        for (const start of blockLineStarts(view, node.from, node.to)) {
          ranges.push(codeLine.range(start, start));
        }
        return false; // 代码块内部不渲染任何内联
      }
      if (node.name === 'Image') {
        if (imageInCode(view, node)) return false;
        const { from, to } = imageCover(view, node.from, node.to);
        const parsed = parseImage(view, from, to);
        if (!parsed) return false;
        const assetId =
          ASSET_ID_TAIL.exec(view.state.sliceDoc(node.to, node.to + 30))?.[1] ??
          null;
        ranges.push(
          Decoration.replace({
            widget: new InlineImageWidget(
              parsed.src,
              parsed.alt,
              assetId,
              node.from,
            ),
          }).range(from, to),
        );
        return false;
      }
      if (node.name === 'Link') {
        const firstChild = node.node.firstChild;
        // `[![图](…)](链接)` 里让图片接管，链接不再包一层
        if (firstChild && firstChild.name === 'Image') return false;
        ranges.push(linkMark.range(node.from, node.to));
        return undefined;
      }
      return undefined;
    },
  });

  return Decoration.set(ranges);
}

const hasUploadEffect = (update: ViewUpdate) =>
  update.transactions.some((transaction) =>
    transaction.effects.some(
      (effect) =>
        effect.is(insertUpload) ||
        effect.is(updateUpload) ||
        effect.is(removeUpload),
    ),
  );

export const livePreviewPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.viewportChanged ||
        hasUploadEffect(update)
      ) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  { decorations: (value) => value.decorations },
);
