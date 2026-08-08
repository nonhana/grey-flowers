import type {
  AssetDto,
  MusicAdmin,
  MusicUpdateInput,
} from '@grey-flowers/contracts';

import { ImagePlus } from 'lucide-react';
import { useState } from 'react';
import { Form } from 'react-aria-components';
import { toast } from 'sonner';

import { apiClient } from '@/app/api/index.js';
import { AssetPickerDialog } from '@/features/articles/editor/asset-picker.js';
import { useDerivedReset } from '@/hooks/use-derived-reset.js';
import { apiErrorMessage } from '@/lib/error-message.js';
import { formatDuration } from '@/lib/format.js';
import {
  Alert,
  AppDialog,
  AssetImage,
  Button,
  FieldLabel,
  MetaLine,
  TextField,
} from '@/ui/index.js';

interface EditForm {
  album: string;
  artist: string;
  cover: string;
  coverAssetId: number | null;
  title: string;
}

export const EditMusicDialog = ({
  music,
  onClose,
  onExited,
  onSaved,
  open,
}: {
  music: MusicAdmin | null;
  onClose: () => void;
  onExited?: () => void;
  onSaved: () => void;
  open: boolean;
}) => {
  const [form, setForm] = useState<EditForm>({
    album: '',
    artist: '',
    cover: '',
    coverAssetId: null,
    title: '',
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 打开对话框时同步当前值（渲染期、受条件保护地调整 state）
  useDerivedReset(open, () => {
    if (open && music) {
      setForm({
        album: music.album,
        artist: music.artist,
        cover: music.cover,
        coverAssetId: music.coverAssetId,
        title: music.title,
      });
      setError(null);
    }
  });

  const save = async () => {
    if (!music) return;
    const title = form.title.trim();
    if (!title) {
      setError('标题不能为空。');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const input: MusicUpdateInput = {
        album: form.album.trim(),
        artist: form.artist.trim(),
        title,
        // 选了受管封面时服务端以资产为准；否则以外部 URL 为准（coverAssetId 报 null 表示无受管封面）。
        ...(form.coverAssetId === null
          ? { cover: form.cover.trim() }
          : { coverAssetId: form.coverAssetId }),
      };
      await apiClient.music.update(music.id, input);
      onSaved();
      onClose();
      toast.success('已保存修改。');
    } catch (saveError) {
      setError(apiErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AppDialog
        isOpen={open}
        onExited={onExited}
        onOpenChange={(isOpen) => {
          if (!isOpen) onClose();
        }}
        size="md"
        title="编辑音乐"
      >
        <Form
          className="grid gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          {music ? (
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
          ) : null}

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
              icon={<ImagePlus aria-hidden="true" />}
              onPress={() => setPickerOpen(true)}
              size="sm"
            >
              更换封面
            </Button>
          </div>

          {error ? <Alert>{error}</Alert> : null}

          <div className="flex justify-end gap-2">
            <Button isDisabled={saving} onPress={onClose}>
              取消
            </Button>
            <Button isLoading={saving} tone="solid" type="submit">
              保存修改
            </Button>
          </div>
        </Form>
      </AppDialog>

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
