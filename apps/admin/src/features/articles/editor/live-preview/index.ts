import type { Extension } from '@codemirror/state';

import { livePreviewPlugin } from './decorations.js';
import { linkClickHandler } from './link-click.js';
import { uploadField } from './upload-state.js';

/**
 * 「纸面」的所见即所得层：正文图片就地渲染、粘贴上传的幽灵占位、
 * 可点链接与块级观感（引用/表格/代码块）。文档本身仍是纯 Markdown——
 * 这里只改“看起来”，不改原文，MDC 指令原样穿过。
 */
export const livePreview = (): Extension[] => [
  uploadField,
  livePreviewPlugin,
  linkClickHandler,
];

export {
  insertUpload,
  removeUpload,
  updateUpload,
  uploadField,
} from './upload-state.js';
export type { UploadEntry } from './upload-state.js';
export { imageActions } from './widgets.js';
export type { ImageActions } from './widgets.js';
export { removeImage, rewriteImageAlt } from './doc-rewrite.js';
