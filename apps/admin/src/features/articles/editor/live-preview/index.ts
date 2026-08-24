import type { Extension } from '@codemirror/state';

import { livePreviewPlugin } from './decorations.js';
import { linkClickHandler } from './link-click.js';
import { uploadField } from './upload-state.js';

/** 纸面所见即所得层：只改“看起来”，不改文档（MDC 指令原样穿过）。 */
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
