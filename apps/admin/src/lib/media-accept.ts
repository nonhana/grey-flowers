import type { AssetMediaType } from '@grey-flowers/contracts';

// react-dropzone 的 accept 需要 MIME 通配 + 扩展名表（原生 input 的逗号分隔字符串它用不了）；MIME 白名单 SSOT 在 contracts
export const IMAGE_ACCEPT_MAP: Record<string, readonly string[]> = {
  'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
};

export const AUDIO_ACCEPT_MAP: Record<string, readonly string[]> = {
  'audio/*': ['.mp3', '.flac', '.wav', '.ogg', '.aac'],
};

/** 图片与音频的并集：去用途化上传通道共用同一 accept 集。 */
export const ANY_ACCEPT_MAP: Record<string, readonly string[]> = {
  ...IMAGE_ACCEPT_MAP,
  ...AUDIO_ACCEPT_MAP,
};

/** 按文件 MIME（含音频扩展名回退）判断类型；选入已过 accept 门禁，未知前缀按图片处理。 */
export const mediaTypeOfFile = (file: File): AssetMediaType => {
  if (file.type.startsWith('audio/')) return 'AUDIO';
  if (file.type.startsWith('image/')) return 'IMAGE';
  const name = file.name.toLowerCase();
  return Object.values(AUDIO_ACCEPT_MAP)
    .flat()
    .some((extension) => name.endsWith(extension))
    ? 'AUDIO'
    : 'IMAGE';
};

export const fileMatchesAccept = (
  accept: Record<string, readonly string[]>,
  file: File,
): boolean => {
  if (
    file.type &&
    Object.keys(accept).some((pattern) =>
      pattern.endsWith('/*')
        ? file.type.startsWith(pattern.slice(0, -1))
        : pattern === file.type,
    )
  ) {
    return true;
  }
  const name = file.name.toLowerCase();
  return Object.values(accept)
    .flat()
    .some((extension) => name.endsWith(extension));
};
