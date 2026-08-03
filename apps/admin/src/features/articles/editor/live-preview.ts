/**
 * 「纸面」的所见即所得层：正文图片就地渲染、粘贴上传的幽灵占位、
 * 可点链接与块级观感（引用/表格/代码块）。文档本身仍是纯 Markdown——
 * 这里只改“看起来”，不改原文，MDC 指令原样穿过。
 *
 * 关键实现点：
 * - 图片：`Image` 节点整体被 `Decoration.replace` 替换成 `<img>`；
 *   `{asset-id=N}` 不在 lezer 的 `Image` 节点内，装饰与删除都要把这段
 *   尾巴一并并入，否则会漏出裸文本。
 * - 上传占位：上传不写进文档（避免污染自动保存），而是塞进一个
 *   UI-only 的 `uploadField`，在插入点渲染带进度的幽灵图；成功后才把
 *   最终 Markdown 插进文档。
 */

import type { Extension, Range } from '@codemirror/state';
import type { DecorationSet, ViewUpdate } from '@codemirror/view';
import type { SyntaxNode } from '@lezer/common';

import { syntaxTree } from '@codemirror/language';
import { StateEffect, StateField } from '@codemirror/state';
import {
  Decoration,
  EditorView,
  ViewPlugin,
  WidgetType,
} from '@codemirror/view';

/* ───────────────────────── 上传幽灵占位状态 ───────────────────────── */

export interface UploadEntry {
  id: string;
  /** 上传完成时正文 Markdown 的插入点 */
  insertAt: number;
  /** 本地预览的 object URL，只用于预览，不写进文档 */
  objectUrl: string;
  progress: number;
  file: File;
}

export const insertUpload = StateEffect.define<UploadEntry>();
export const updateUpload = StateEffect.define<{
  id: string;
  progress: number;
}>();
export const removeUpload = StateEffect.define<string>();

export const uploadField = StateField.define<UploadEntry[]>({
  create: () => [],
  update(entries, transaction) {
    let next = entries;
    let changed = false;
    for (const effect of transaction.effects) {
      if (effect.is(insertUpload)) {
        next = [...next, effect.value];
        changed = true;
      } else if (effect.is(updateUpload)) {
        const { id, progress } = effect.value;
        next = next.map((entry) =>
          entry.id === id && entry.progress !== progress
            ? { ...entry, progress }
            : entry,
        );
        changed = true;
      } else if (effect.is(removeUpload)) {
        const id = effect.value;
        if (next.some((entry) => entry.id === id)) {
          next = next.filter((entry) => entry.id !== id);
          changed = true;
        }
      }
    }
    return changed ? next : entries;
  },
});

/* ───────────────────── 图片形态与区块观感的判定 ───────────────────── */

const INLINE_IMAGE = /^!\[([\s\S]*?)\]\(\s*([^)\s]+(?:\s+["'][^)]*)?)\)/;

const ASSET_ID_TAIL = /^\{asset-id=(\d+)\}/;

/** `{asset-id=N}` 尾巴不在 Image 节点内：把这段并进装饰范围。 */
function imageCover(view: EditorView, from: number, to: number) {
  const tail = view.state.sliceDoc(to, to + 30);
  const match = ASSET_ID_TAIL.exec(tail);
  return match ? { from, to: to + match[0].length } : { from, to };
}

function parseImage(view: EditorView, from: number, to: number) {
  const text = view.state.sliceDoc(from, to);
  const match = INLINE_IMAGE.exec(text);
  if (!match) return null;
  return { alt: match[1] ?? '', src: match[2] ?? '' };
}

/** 图片是否落在代码语境里（理论上 Image 不会被 CodeText 解析出来，双保险）。 */
function imageInCode(view: EditorView, node: { from: number; to: number }) {
  let current = syntaxTree(view.state).resolveInner(node.from).parent;
  while (current) {
    if (current.name === 'FencedCode' || current.name === 'InlineCode') {
      return true;
    }
    current = current.parent;
  }
  return false;
}

/** 给块级元素内逐行加类，形成连续的一块（引用左边线、代码块底色…）。 */
function blockLineStarts(view: EditorView, from: number, to: number) {
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

/* ─────────────────────────────── Widgets ─────────────────────────────── */

/** React 侧的交互出口；CodeMirrorPane 挂载时注入。 */
export interface ImageActions {
  open: (src: string, alt: string, assetId: string | null) => void;
  edit: (src: string, alt: string) => void;
  remove: (src: string, anchor: number) => void;
}

export const imageActions: { current: ImageActions | null } = {
  current: null,
};

class InlineImageWidget extends WidgetType {
  constructor(
    private readonly src: string,
    private readonly alt: string,
    private readonly assetId: string | null,
    private readonly anchor: number,
  ) {
    super();
  }

  eq(other: InlineImageWidget) {
    return (
      other.src === this.src &&
      other.alt === this.alt &&
      other.assetId === this.assetId
    );
  }

  toDOM() {
    const wrap = document.createElement('span');
    wrap.className = 'gf-live-img';

    const img = document.createElement('img');
    img.className = 'gf-live-img-thumb';
    img.src = this.src;
    img.alt = this.alt || '图片';
    img.draggable = false;
    img.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      imageActions.current?.open(this.src, this.alt, this.assetId);
    });
    wrap.appendChild(img);

    const bar = document.createElement('span');
    bar.className = 'gf-live-img-bar';
    bar.setAttribute('role', 'toolbar');
    bar.setAttribute('aria-label', '图片操作');

    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'gf-live-img-act';
    edit.textContent = '编辑';
    edit.title = '编辑替代文字';
    edit.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      imageActions.current?.edit(this.src, this.alt);
    });
    bar.appendChild(edit);

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'gf-live-img-act';
    remove.textContent = '删除';
    remove.title = '删除这张图片';
    remove.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      imageActions.current?.remove(this.src, this.anchor);
    });
    bar.appendChild(remove);

    wrap.appendChild(bar);
    return wrap;
  }

  ignoreEvent() {
    return true;
  }
}

class UploadGhostWidget extends WidgetType {
  constructor(private readonly item: UploadEntry) {
    super();
  }

  eq(other: UploadGhostWidget) {
    return other.item.id === this.item.id;
  }

  toDOM() {
    const wrap = document.createElement('span');
    wrap.className = 'gf-live-ghost';

    const img = document.createElement('img');
    img.className = 'gf-live-ghost-img';
    img.src = this.item.objectUrl;
    img.alt = this.item.file.name;

    const meta = document.createElement('span');
    meta.className = 'gf-live-ghost-meta';
    meta.textContent = `上传中 ${String(Math.round(this.item.progress * 100))}%`;

    wrap.append(img, meta);
    return wrap;
  }

  ignoreEvent() {
    return true;
  }
}

/* ──────────────────────────── 装饰构建与插件 ──────────────────────────── */

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

const livePreviewPlugin = ViewPlugin.fromClass(
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

/* ─────────────────────────────── 链接点击 ─────────────────────────────── */

const linkClickHandler = EditorView.domEventHandlers({
  click: (event, view) => {
    if (!(event.metaKey || event.ctrlKey)) return false;
    if (event.altKey || event.shiftKey) return false;

    const position = view.posAtCoords(event);
    if (position == null) return false;

    let current: SyntaxNode | null = syntaxTree(view.state).resolveInner(
      position,
    );
    while (current && current.name !== 'Link') current = current.parent;
    if (!current) return false;

    const text = view.state.sliceDoc(current.from, current.to);
    const match = /\]\(\s*([^)\s]+)/.exec(text);
    if (!match) return false;

    event.preventDefault();
    window.open(match[1], '_blank', 'noopener');
    return true;
  },
});

export const livePreview = (): Extension[] => [
  uploadField,
  livePreviewPlugin,
  linkClickHandler,
];

/* ─────────────────── 供 React 对话框调用的文档改写 ─────────────────── */

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
