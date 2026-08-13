import { StateEffect, StateField } from '@codemirror/state';

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

/**
 * 上传占位状态：上传不写进文档（避免污染自动保存），而是塞进这个
 * UI-only 的 field，在插入点渲染带进度的幽灵图；成功后才把最终
 * Markdown 插进文档。
 */
export const uploadField = StateField.define<UploadEntry[]>({
  create: () => [],
  update(entries, transaction) {
    let next = entries;
    let changed = false;

    // 上传在途期间文档可能被输入改动：占位插入点要沿文档变更平移，否则
    // 上传完成时按陈旧坐标落插入会漂移。上传自身带起的变更不需要平移到
    // 本事务新 effect 的坐标 —— insertAt 已在 dispatch 时按当前文档给好；
    // 同事务被移除的 entry 平移结果不产生副作用。
    if (!transaction.changes.empty) {
      next = entries.map((entry) => ({
        ...entry,
        insertAt: transaction.changes.mapPos(entry.insertAt, 1),
      }));
      changed = true;
    }

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
