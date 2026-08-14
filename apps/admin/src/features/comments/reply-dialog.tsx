import { useState } from 'react';
import { Form } from 'react-aria-components';
import { toast } from 'sonner';

import { apiClient } from '@/app/api/index.js';
import { useDerivedReset } from '@/hooks/use-derived-reset.js';
import { apiErrorMessage } from '@/lib/error-message.js';
import { Button } from '@/ui/button.js';
import { Alert } from '@/ui/feedback.js';
import { TextAreaField } from '@/ui/form.js';
import { AppDialog } from '@/ui/overlay.js';

const MD_HINT =
  'MD 支持：**粗体**、*斜体*、~~删除线~~、[链接](url)、> 引用、- 列表、`代码` · 不支持标题/表格/图片/HTML · 最多 2048 字';

export interface ReplyTarget {
  content: string;
  id: number;
  username: string;
}

export const ReplyDialog = ({
  onClose,
  onExited,
  onReplied,
  open,
  target,
}: {
  onClose: () => void;
  onExited?: () => void;
  onReplied: () => void;
  open: boolean;
  target: ReplyTarget | null;
}) => {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 打开时同步当前目标（渲染期、受条件保护地调整 state）
  useDerivedReset(open, () => {
    if (open) {
      setContent('');
      setError(null);
    }
  });

  const send = async () => {
    if (!target) return;
    const body = content.trim();
    if (!body) {
      setError('回复内容不能为空。');
      return;
    }

    setSending(true);
    setError(null);
    try {
      await apiClient.comments.reply(target.id, { content: body });
      onReplied();
      onClose();
      toast.success(`已回复，将通知 ${target.username}`);
    } catch (sendError) {
      setError(apiErrorMessage(sendError));
    } finally {
      setSending(false);
    }
  };

  return (
    <AppDialog
      isOpen={open}
      onExited={onExited}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      size="md"
      title={target ? `回复 ${target.username}` : '回复'}
    >
      <Form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        {target ? (
          <blockquote
            className="
              line-clamp-3 rounded-control border-l-2 border-accent-rule bg-well
              px-3 py-2 text-sm text-ink-dim
            "
          >
            {target.content}
          </blockquote>
        ) : null}

        <TextAreaField
          label="回复内容"
          onChange={setContent}
          placeholder="写下你的回复…"
          rows={5}
          value={content}
        />
        <p className="px-1 text-xs/relaxed text-ink-dim">{MD_HINT}</p>

        {error ? <Alert>{error}</Alert> : null}

        <div className="flex justify-end gap-2">
          <Button isDisabled={sending} onPress={onClose}>
            取消
          </Button>
          <Button isLoading={sending} tone="solid" type="submit">
            发送回复
          </Button>
        </div>
      </Form>
    </AppDialog>
  );
};
