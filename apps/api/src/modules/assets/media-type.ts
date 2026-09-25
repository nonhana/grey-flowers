import type { AssetMediaType } from '@grey-flowers/contracts';

import {
  ASSET_AUDIO_MIME_TYPES,
  ASSET_IMAGE_MIME_TYPES,
} from '@grey-flowers/contracts';

/** MIME 白名单 → mediaType；两表互不重叠，normalize 后再查询。 */
const mimeToMediaType = new Map<string, AssetMediaType>([
  ...ASSET_IMAGE_MIME_TYPES.map((mime) => [mime, 'IMAGE'] as const),
  ...ASSET_AUDIO_MIME_TYPES.map((mime) => [mime, 'AUDIO'] as const),
]);

export const mediaTypeOfMime = (mime: string): AssetMediaType | undefined =>
  mimeToMediaType.get(mime);
