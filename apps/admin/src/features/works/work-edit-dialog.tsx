import type { WorkAdmin, WorkCreateInput } from '@grey-flowers/contracts';

import { workCreateInputSchema } from '@grey-flowers/contracts';
import { useMutation } from '@tanstack/react-query';
import { ClipboardPaste, ImagePlus, TriangleAlert, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { apiClient, isApiRequestError } from '@/app/api/index';
import { invalidateWorksAfterMutation } from '@/app/server-state/modules/works';
import { parseLinkJson } from '@/lib/link-json';
import { Button, IconButton } from '@/ui/button';
import { Alert } from '@/ui/feedback';
import { FileDrop } from '@/ui/file-drop';
import { FieldLabel, TextAreaField, TextField } from '@/ui/form';
import { AssetImage } from '@/ui/image';
import { AppDialog, ConfirmDialog } from '@/ui/overlay';

/** Logo 拖放/选择的 accept 集：assets 图片档 + svg/avif（服务端白名单见 contracts）。 */
const LOGO_ACCEPT_MAP: Record<string, readonly string[]> = {
  'image/*': ['.avif', '.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp'],
};

interface WorkForm {
  site: string;
  owner: string;
  url: string;
  image: string;
  description: string;
  color: string;
}

const EMPTY_FORM: WorkForm = {
  color: '',
  description: '',
  image: '',
  owner: '',
  site: '',
  url: '',
};

/** 单次打开会话内的表单：挂载时以当前 work 初始化（null 即新建），Logo 上传序列与确认弹窗同住会话内，重开由 session key 重建 */
const WorkFormBody = ({
  onClose,
  work,
}: {
  onClose: () => void;
  work: WorkAdmin | null;
}) => {
  const [form, setForm] = useState<WorkForm>(() =>
    work
      ? {
          color: work.color ?? '',
          description: work.description,
          image: work.image,
          owner: work.owner,
          site: work.site,
          url: work.url,
        }
      : EMPTY_FORM,
  );
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoFilename, setLogoFilename] = useState('');
  // 会话内冻结的原始 Logo：编辑时据此判断是否真删 works-logo/ 对象，重开由 session 重建
  const [originalImage] = useState(work?.image ?? '');
  const [logoConfirm, setLogoConfirm] = useState<'remove' | 'replace' | null>(
    null,
  );
  const pendingInputRef = useRef<WorkCreateInput | null>(null);
  const uploadedUrlRef = useRef<string | null>(null);

  // 会话内产生的 blob 预览属浏览器外部资源：换图/卸载时回收，避免悬空引用累积
  useEffect(() => {
    return () => {
      if (form.image.startsWith('blob:')) URL.revokeObjectURL(form.image);
    };
  }, [form.image]);

  const saveMutation = useMutation({
    mutationFn: async (input: WorkCreateInput) => {
      let image = input.image;
      if (work && originalImage !== '') {
        // 移除/更换：确认弹窗通过后才走到这里；真删 works-logo/ 对象并清字段
        if (image === '' || logoFile !== null) {
          await apiClient.works.removeLogo(work.id);
        }
      }
      if (logoFile !== null) {
        let uploadedUrl = uploadedUrlRef.current;
        if (uploadedUrl === null) {
          const uploaded = await apiClient.works.uploadLogo({
            file: logoFile,
            filename: logoFilename.trim(),
          });
          uploadedUrl = uploaded.deliveryUrl;
          uploadedUrlRef.current = uploadedUrl;
        }
        image = uploadedUrl;
      }
      const finalInput = { ...input, image };
      return work
        ? apiClient.works.update(work.id, finalInput)
        : apiClient.works.create(finalInput);
    },
    onSuccess: async () => {
      if (form.image.startsWith('blob:')) URL.revokeObjectURL(form.image);
      onClose();
      await invalidateWorksAfterMutation();
      toast.success(work ? '已保存修改。' : '作品已创建。');
    },
    onError: (saveError, input) => {
      setError(
        isApiRequestError(saveError, 'CONFLICT')
          ? `URL「${input.url ?? ''}」已被其他作品使用。`
          : isApiRequestError(saveError)
            ? saveError.message
            : '保存失败，请重试。',
      );
    },
  });

  /** 粘贴 JSON → 解析回填表单；用户确认前仍可修改任意字段。 */
  const applyPaste = () => {
    const result = parseLinkJson(pasteText, workCreateInputSchema);
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
    if (logoFile !== null && logoFilename.trim() === '') {
      setError('请填写上传文件名。');
      return;
    }
    const parsed = workCreateInputSchema.safeParse({
      color: form.color === '' ? undefined : form.color,
      description: form.description,
      // 待上传的 blob 不是可入库 URL；image 最终值由保存序列决定
      image: form.image.startsWith('blob:') ? '' : form.image,
      owner: form.owner,
      site: form.site,
      url: form.url,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? '保存失败。');
      return;
    }
    setError(null);
    if (
      work &&
      originalImage !== '' &&
      (parsed.data.image === '' || logoFile !== null)
    ) {
      // 移除/更换原 Logo 需真删 R2 对象：先过确认弹窗
      setLogoConfirm(logoFile !== null ? 'replace' : 'remove');
      pendingInputRef.current = parsed.data;
      return;
    }
    saveMutation.mutate(parsed.data);
  };

  const confirmLogoAction = () => {
    const input = pendingInputRef.current;
    setLogoConfirm(null);
    pendingInputRef.current = null;
    if (!input) return;
    saveMutation.mutate(input);
  };

  const onLogoFile = (file: File) => {
    setLogoFile(file);
    setLogoFilename(file.name.replace(/[^\p{L}\p{N}._-]/gu, '-'));
    setForm((current) => ({ ...current, image: URL.createObjectURL(file) }));
  };

  const clearLogoSelection = () => {
    if (form.image.startsWith('blob:')) URL.revokeObjectURL(form.image);
    setLogoFile(null);
    setLogoFilename('');
    uploadedUrlRef.current = null;
    setForm((current) => ({ ...current, image: '' }));
  };

  return (
    <>
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
              label="作品信息 JSON"
              onChange={setPasteText}
              placeholder='{"site": "Picals", "owner": "non_hana", "url": "https://picals.caelum.moe", "description": "…", "image": "https://…", "color": "#00BFFF"}'
              rows={7}
              value={pasteText}
            />
            {pasteError ? (
              <p
                className="
                  flex items-start gap-1.5 text-xs/relaxed text-danger-text
                "
              >
                <TriangleAlert
                  aria-hidden
                  className="mt-0.5 size-3.5 shrink-0"
                />
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
          label="作品名"
          onChange={(value) =>
            setForm((current) => ({ ...current, site: value }))
          }
          value={form.site}
        />

        <TextField
          isRequired
          label="作者"
          onChange={(value) =>
            setForm((current) => ({ ...current, owner: value }))
          }
          value={form.owner}
        />

        <TextField
          className="font-mono"
          isRequired
          label="链接 URL"
          onChange={(value) =>
            setForm((current) => ({ ...current, url: value }))
          }
          placeholder="https://"
          value={form.url}
        />

        <div className="grid gap-2">
          <FieldLabel>Logo</FieldLabel>
          {form.image === '' && logoFile === null ? (
            <FileDrop accept={LOGO_ACCEPT_MAP} onFile={onLogoFile}>
              <ImagePlus aria-hidden className="size-4 shrink-0" />
              <span>点击选择或拖入图片（png/jpg/webp/svg/gif/avif）</span>
            </FileDrop>
          ) : (
            <div className="flex items-center gap-3">
              <div
                className="
                  grid size-16 shrink-0 place-items-center overflow-hidden
                  rounded-control border border-rule bg-well
                "
              >
                <AssetImage
                  alt="Logo 预览"
                  className="size-full object-contain"
                  src={form.image}
                />
              </div>
              {logoFile !== null ? (
                <TextField
                  className="flex-1 font-mono"
                  description="同名文件已存在时需要换一个名字。"
                  label="上传文件名"
                  onChange={setLogoFilename}
                  value={logoFilename}
                />
              ) : (
                <p
                  className="
                    min-w-0 flex-1 truncate font-mono text-2xs text-ink-dim
                  "
                  title={form.image}
                >
                  {form.image}
                </p>
              )}
              <IconButton
                label={logoFile !== null ? '取消已选文件' : '移除 Logo'}
                onPress={clearLogoSelection}
                size="sm"
                tone="warnish"
              >
                <X aria-hidden />
              </IconButton>
            </div>
          )}
        </div>

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
            {work ? '保存修改' : '创建'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        confirmLabel={logoConfirm === 'replace' ? '更换 Logo' : '移除 Logo'}
        isDestructive
        isOpen={logoConfirm !== null}
        message={
          logoConfirm === 'replace'
            ? '确认后将删除原 Logo 并上传新图片，此操作无法撤销。'
            : '确认后将删除当前 Logo 文件，此操作无法恢复。'
        }
        onCancel={() => {
          setLogoConfirm(null);
          pendingInputRef.current = null;
        }}
        onConfirm={() => void confirmLogoAction()}
        title={
          logoConfirm === 'replace'
            ? '是否确认更换 Logo？'
            : '是否确认移除 Logo？'
        }
      />
    </>
  );
};

/** 新建与编辑共用一个会话：work 为 null 即新建，body 按 session 重建 */
export const WorkEditDialog = ({
  onClose,
  onExited,
  open,
  work,
}: {
  onClose: () => void;
  onExited?: () => void;
  open: boolean;
  work: WorkAdmin | null;
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
      title={work ? `编辑「${work.site}」` : '新建作品'}
    >
      <WorkFormBody key={session} onClose={onClose} work={work} />
    </AppDialog>
  );
};
