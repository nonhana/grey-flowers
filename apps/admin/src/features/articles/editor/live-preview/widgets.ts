import { WidgetType } from '@codemirror/view';

import type { UploadEntry } from './upload-state.js';

/** React 侧的交互出口；CodeMirrorPane 挂载时注入。 */
export interface ImageActions {
  open: (src: string, alt: string, assetId: string | null) => void;
  edit: (src: string, alt: string) => void;
  remove: (src: string, anchor: number) => void;
}

export const imageActions: { current: ImageActions | null } = {
  current: null,
};

export class InlineImageWidget extends WidgetType {
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

export class UploadGhostWidget extends WidgetType {
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
