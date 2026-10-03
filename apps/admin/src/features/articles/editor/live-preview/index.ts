import type { Extension } from '@codemirror/state';

import { livePreviewPlugin } from './decorations';
import { linkClickHandler } from './link-click';
import { musicDirectiveExtension } from './music-widget';
import { uploadField } from './upload-state';

export const livePreview = (): Extension[] => [
  uploadField,
  livePreviewPlugin,
  linkClickHandler,
  ...musicDirectiveExtension,
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
export { formatMusicDirective, locateMusicDirective } from './music-directive';
export { musicActions } from './music-widget';
export type { MusicActions } from './music-widget';
export { removeImage, rewriteImageAlt, rewriteMusicIds } from './doc-rewrite';
