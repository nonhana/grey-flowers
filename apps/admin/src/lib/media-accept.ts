export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/gif,image/webp';
export const AUDIO_ACCEPT =
  'audio/mpeg,audio/wav,audio/ogg,audio/flac,audio/aac';

// react-dropzone 的 accept 需要 MIME 通配 + 扩展名表（原生 input 的逗号分隔
// 字符串它用不了），与上面的字符串常量保持同一份类型清单。
export const IMAGE_ACCEPT_MAP: Record<string, readonly string[]> = {
  'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
};

export const AUDIO_ACCEPT_MAP: Record<string, readonly string[]> = {
  'audio/*': ['.mp3', '.flac', '.wav', '.ogg', '.aac'],
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
