import type {
  AssetDto,
  MusicAdmin,
  MusicUpdateInput,
} from '@grey-flowers/contracts';

import { useMutation } from '@tanstack/react-query';
import { ImagePlus } from 'lucide-react';
import { useState } from 'react';
import { Form } from 'react-aria-components';
import { toast } from 'sonner';

import { apiClient } from '@/app/api/index.js';
import { invalidateMusicAfterMutation } from '@/app/server-state/music.js';
import { AssetPickerDialog } from '@/features/articles/editor/asset-picker.js';
import { apiErrorMessage } from '@/lib/error-message.js';
import { formatDuration } from '@/lib/format.js';
import { Button } from '@/ui/button.js';
import { Alert } from '@/ui/feedback.js';
import { FieldLabel, TextField } from '@/ui/form.js';
import { AssetImage } from '@/ui/image.js';
import { AppDialog } from '@/ui/overlay.js';
import { MetaLine } from '@/ui/surface.js';

interface EditForm {
  album: string;
  artist: string;
  cover: string;
  coverAssetId: number | null;
  title: string;
}

/** 单次打开会话内的表单：挂载时以当前 music 初始化，重开由 session key 重建。 */
const EditForm = ({
  music,
  onClose,
}: {
  music: MusicAdmin;
  onClose: () => void;
}) => {
  const [form, setForm] = useState<EditForm>({
    album: music.album,
    artist: music.artist,
    cover: music.cover,
    coverAssetId: music.coverAssetId,
    title: music.title,
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: (input: MusicUpdateInput) =>
      apiClient.music.update(music.id, input),
    onSuccess: async () => {
      onClose();
      toast.success('已保存修改。');
      await invalidateMusicAfterMutation();
    },
    onError: (saveError) => {
      setError(apiErrorMessage(saveError));
    },
  });

  const save = () => {
    const title = form.title.trim();
    if (!title) {
      setError('标题不能为空。');
      return;
    }
    setError(null);
    const input: MusicUpdateInput = {
      album: form.album.trim(),
      artist: form.artist.trim(),
      title,
      // 选了受管封面时服务端以资产为准；否则以外部 URL 为准（coverAssetId 报 null 表示无受管封面）。
      ...(form.coverAssetId === null
        ? { cover: form.cover.trim() }
        : { coverAssetId: form.coverAssetId }),
    };
    saveMutation.mutate(input);
  };

  return (
    <>
      <Form
        className="grid gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <div
          className="
            grid grid-cols-[3.5rem_1fr] items-center gap-3 rounded-control
            border border-rule bg-well p-2.5
          "
        >
          <span
            className="
              grid size-14 shrink-0 place-items-center overflow-hidden
              rounded-control bg-case-raised
            "
          >
            {music.cover ? (
              <AssetImage
                alt=""
                className="size-full object-cover"
                src={music.cover}
              />
            ) : null}
          </span>
          <span className="grid min-w-0 gap-1">
            <span className="truncate text-md text-ink-strong">
              {music.title}
            </span>
            <MetaLine>
              <span>{formatDuration(music.seconds)}</span>
              <span className="truncate">
                {music.sourceAsset?.storageKey ?? music.src}
              </span>
            </MetaLine>
          </span>
        </div>

        <TextField
          isRequired
          label="标题"
          onChange={(value) =>
            setForm((current) => ({ ...current, title: value }))
          }
          placeholder="输入音乐标题"
          value={form.title}
        />
        <TextField
          label="艺术家"
          onChange={(value) =>
            setForm((current) => ({ ...current, artist: value }))
          }
          placeholder="输入艺术家名称"
          value={form.artist}
        />
        <TextField
          label="专辑"
          onChange={(value) =>
            setForm((current) => ({ ...current, album: value }))
          }
          placeholder="输入专辑名称"
          value={form.album}
        />

        <div className="grid gap-2">
          <FieldLabel>封面</FieldLabel>
          {form.cover ? (
            <div
              className="
                overflow-hidden rounded-control border border-rule bg-well
              "
            >
              <AssetImage
                alt="封面预览"
                className="aspect-video w-full object-cover"
                src={form.cover}
              />
            </div>
          ) : null}
          <Button
            icon={<ImagePlus aria-hidden />}
            onPress={() => setPickerOpen(true)}
            size="sm"
          >
            更换封面
          </Button>
        </div>

        {error ? <Alert>{error}</Alert> : null}

        <div className="flex justify-end gap-2">
          <Button isDisabled={saveMutation.isPending} onPress={onClose}>
            取消
          </Button>
          <Button isLoading={saveMutation.isPending} tone="solid" type="submit">
            保存修改
          </Button>
        </div>
      </Form>

      <AssetPickerDialog
        onClose={() => setPickerOpen(false)}
        onSelect={(asset: AssetDto) => {
          setForm((current) => ({
            ...current,
            cover: asset.deliveryUrl,
            coverAssetId: asset.id,
          }));
          setPickerOpen(false);
        }}
        open={pickerOpen}
        purpose="MUSIC_COVER"
        title="选择音乐封面"
      />
    </>
  );
};

export const EditMusicDialog = ({
  music,
  onClose,
  onExited,
  open,
}: {
  music: MusicAdmin | null;
  onClose: () => void;
  onExited?: () => void;
  open: boolean;
}) => {
  // 每次 open 产生新的 session identity：keyed inner form 据此重建，
  // 同一首曲目快速重开也拿到以当前数据初始化的全新表单。
  const [session, setSession] = useState(0);
  const [wasOpen, setWasOpen] = useState(open);
  if (open && !wasOpen) {
    setWasOpen(true);
    setSession((current) => current + 1);
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  return (
    <AppDialog
      isOpen={open}
      onExited={onExited}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
      size="md"
      title="编辑音乐"
    >
      {music ? (
        <EditForm key={session} music={music} onClose={onClose} />
      ) : null}
    </AppDialog>
  );
};
