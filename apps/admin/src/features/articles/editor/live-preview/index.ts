import type { Extension } from '@codemirror/state';

import { livePreviewPlugin } from './decorations';
import { linkClickHandler } from './link-click';
import { uploadField } from './upload-state';

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
} from './upload-state';
export type { UploadEntry } from './upload-state';
export { imageActions } from './widgets';
export type { ImageActions } from './widgets';
export { removeImage, rewriteImageAlt } from './doc-rewrite';
