import type { WorkCreateInput, WorkUpdateInput } from '@grey-flowers/contracts';

import {
  workDeleteResponseSchema,
  workListResponseSchema,
  workLogoConfirmResponseSchema,
  workLogoRemoveResponseSchema,
  workLogoUploadUrlResponseSchema,
  workReorderResponseSchema,
  workResponseSchema,
} from '@grey-flowers/contracts';

import type { Channel } from '../transport';

import { putUpload } from '../upload';

export const createWorksApi = (channel: Channel) => ({
  list: (signal?: AbortSignal) =>
    channel.get('/works', workListResponseSchema, { signal }),
  create: (input: WorkCreateInput) =>
    channel.post('/works', workResponseSchema, { json: input }),
  update: (id: number, input: WorkUpdateInput) =>
    channel.patch(`/works/${id}`, workResponseSchema, { json: input }),
  reorder: (ids: number[]) =>
    channel.patch('/works/reorder', workReorderResponseSchema, {
      json: { ids },
    }),
  remove: (id: number) =>
    channel.delete(`/works/${id}`, workDeleteResponseSchema),
  uploadLogo: async (
    input: { file: File; filename: string },
    signal?: AbortSignal,
  ) => {
    const { contentType, key, maxBytes, uploadUrl } = await channel.post(
      '/works/logo/upload-url',
      workLogoUploadUrlResponseSchema,
      { json: { filename: input.filename, size: input.file.size }, signal },
    );
    if (input.file.size > maxBytes) {
      throw new Error(`Logo 超过 ${Math.floor(maxBytes / 1024 / 1024)}MB 限制`);
    }
    await putUpload(uploadUrl, input.file, contentType, undefined, signal);
    return channel.post('/works/logo/confirm', workLogoConfirmResponseSchema, {
      json: { key },
      signal,
    });
  },
  removeLogo: (id: number) =>
    channel.delete(`/works/${id}/logo`, workLogoRemoveResponseSchema),
});

export type WorksApi = ReturnType<typeof createWorksApi>;
