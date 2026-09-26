import type { FriendAdmin, FriendCreateInput } from '@grey-flowers/contracts';

import { friendCreateInputSchema } from '@grey-flowers/contracts';
import { useMutation } from '@tanstack/react-query';
import { ClipboardPaste, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { apiClient, isApiRequestError } from '@/app/api/index';
import { invalidateFriendsAfterMutation } from '@/app/server-state/modules/friends';
import { parseLinkJson } from '@/lib/link-json';
import { Button } from '@/ui/button';
import { Alert } from '@/ui/feedback';
import { TextAreaField, TextField } from '@/ui/form';
import { AppDialog } from '@/ui/overlay';

interface FriendForm {
  site: string;
  owner: string;
  url: string;
  image: string;
  description: string;
  color: string;
}

const EMPTY_FORM: FriendForm = {
  color: '',
  description: '',
  image: '',
  owner: '',
  site: '',
  url: '',
};

const JSON_PLACEHOLDER = `{
  "site": "Greyflowers",
  "owner": "non_hana",
  "url": "https://caelum.moe",
  "description": "…",
  "image": "https://…",
  "color": "#858585"
}
`;

/** 单次打开会话内的表单：挂载时以当前 friend 初始化（null 即新建），重开由 session key 重建 */
const FriendFormBody = ({
  friend,
  onClose,
}: {
  friend: FriendAdmin | null;
  onClose: () => void;
}) => {
  const [form, setForm] = useState<FriendForm>(() =>
    friend
      ? {
          color: friend.color ?? '',
          description: friend.description,
          image: friend.image,
          owner: friend.owner,
          site: friend.site,
          url: friend.url,
        }
      : EMPTY_FORM,
  );
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: (input: FriendCreateInput) =>
      friend
        ? apiClient.friends.update(friend.id, input)
        : apiClient.friends.create(input),
    onSuccess: async () => {
      onClose();
      await invalidateFriendsAfterMutation();
      toast.success(friend ? '已保存修改。' : '友链已创建。');
    },
    onError: (saveError, input) => {
      setError(
        isApiRequestError(saveError, 'CONFLICT')
          ? `URL「${input.url ?? ''}」已被其他友链使用。`
          : isApiRequestError(saveError)
            ? saveError.message
            : '保存失败，请重试。',
      );
    },
  });

  /** 粘贴 JSON → 解析回填表单；用户确认前仍可修改任意字段。 */
  const applyPaste = () => {
    const result = parseLinkJson(pasteText, friendCreateInputSchema);
    if (!result.ok) {
      setPasteError(result.error);
      return;
    }
    setForm(result.form);
    setError(null);
    setPasteError(null);
    setPasteText('');
    setPasteOpen(false);
    toast.success('已解析并填充，检查无误后保存。');
  };

  const save = () => {
    const parsed = friendCreateInputSchema.safeParse({
      color: form.color === '' ? undefined : form.color,
      description: form.description,
      image: form.image,
      owner: form.owner,
      site: form.site,
      url: form.url,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? '保存失败。');
      return;
    }
    setError(null);
    saveMutation.mutate(parsed.data);
  };

  return (
    <div className="grid gap-5">
      <Button
        icon={<ClipboardPaste aria-hidden />}
        onPress={() => setPasteOpen((open) => !open)}
        size="sm"
      >
        {pasteOpen ? '收起 JSON 粘贴' : '粘贴 JSON 快速填充'}
      </Button>

      {pasteOpen ? (
        <div className="grid gap-2">
          <TextAreaField
            description="粘贴后自动填入下方表单，确认前仍可修改；兼容旧模板的 desc 字段。"
            label="站点信息 JSON"
            onChange={setPasteText}
            placeholder={JSON_PLACEHOLDER}
            rows={7}
            value={pasteText}
          />
          {pasteError ? (
            <p
              className="
                flex items-start gap-1.5 text-xs/relaxed text-danger-text
              "
            >
              <TriangleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" />
              {pasteError}
            </p>
          ) : null}
          <div className="flex justify-end">
            <Button onPress={applyPaste} size="sm" tone="solid">
              解析并填充
            </Button>
          </div>
        </div>
      ) : null}

      <TextField
        isRequired
        label="站点名"
        onChange={(value) =>
          setForm((current) => ({ ...current, site: value }))
        }
        value={form.site}
      />

      <TextField
        isRequired
        label="站长"
        onChange={(value) =>
          setForm((current) => ({ ...current, owner: value }))
        }
        value={form.owner}
      />

      <TextField
        className="font-mono"
        isRequired
        label="链接 URL"
        onChange={(value) => setForm((current) => ({ ...current, url: value }))}
        placeholder="https://"
        value={form.url}
      />

      <TextField
        className="font-mono"
        isRequired
        label="头像 URL"
        onChange={(value) =>
          setForm((current) => ({ ...current, image: value }))
        }
        placeholder="https://"
        value={form.image}
      />

      <TextAreaField
        isRequired
        label="描述"
        onChange={(value) =>
          setForm((current) => ({ ...current, description: value }))
        }
        value={form.description}
      />

      <TextField
        className="font-mono"
        label="主题色"
        onChange={(value) =>
          setForm((current) => ({ ...current, color: value }))
        }
        placeholder="#00BFFF"
        value={form.color}
      />

      {error ? <Alert>{error}</Alert> : null}

      <div className="flex justify-end gap-2">
        <Button onPress={onClose}>取消</Button>
        <Button
          isLoading={saveMutation.isPending}
          onPress={() => void save()}
          tone="solid"
        >
          {friend ? '保存修改' : '创建'}
        </Button>
      </div>
    </div>
  );
};

/** 新建与编辑共用一个会话：friend 为 null 即新建，body 按 session 重建 */
export const FriendEditDialog = ({
  friend,
  onClose,
  onExited,
  open,
}: {
  friend: FriendAdmin | null;
  onClose: () => void;
  onExited?: () => void;
  open: boolean;
}) => {
  // 每次 open 产生新的 session identity：keyed inner form 据此重建，快速重开也拿到全新表单
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
      title={friend ? `编辑「${friend.site}」` : '新建友链'}
    >
      <FriendFormBody friend={friend} key={session} onClose={onClose} />
    </AppDialog>
  );
};
