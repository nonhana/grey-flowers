import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Form } from 'react-aria-components';
import { toast } from 'sonner';

import { apiClient } from '@/app/api/index.js';
import { invalidateCommentsAfterMutation } from '@/app/server-state/comments.js';
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

/** 单次打开会话内的表单：content 每次打开都从空白开始。 */
const ReplyForm = ({
  onSent,
  target,
}: {
  onSent: () => void;
  target: ReplyTarget;
}) => {
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  // sent 态（L-17）：成功到对话框卸载之间的退出动画窗口里，提交与取消
  // 都被禁用 —— 成功瞬间连点不可能发出第二条回复。
  const [sent, setSent] = useState(false);

  const sendMutation = useMutation({
    mutationFn: (body: string) =>
      apiClient.comments.reply(target.id, { content: body }),
    onSuccess: async () => {
      setSent(true);
      onSent();
      toast.success(`已回复，将通知 ${target.username}`);
      await invalidateCommentsAfterMutation();
    },
    onError: (sendError) => {
      setError(apiErrorMessage(sendError));
    },
  });

  const send = () => {
    const body = content.trim();
    if (!body) {
      setError('回复内容不能为空。');
      return;
    }
    setError(null);
    sendMutation.mutate(body);
  };

  return (
    <Form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void send();
      }}
    >
      <blockquote
        className="
          line-clamp-3 rounded-control border-l-2 border-accent-rule bg-well
          px-3 py-2 text-sm text-ink-dim
        "
      >
        {target.content}
      </blockquote>

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
        <Button
          isDisabled={sent || sendMutation.isPending}
          onPress={onSent}
          type="button"
        >
          取消
        </Button>
        <Button
          isDisabled={sent}
          isLoading={sendMutation.isPending}
          tone="solid"
          type="submit"
        >
          发送回复
        </Button>
      </div>
    </Form>
  );
};

export const ReplyDialog = ({
  onClose,
  onExited,
  open,
  session,
  target,
}: {
  onClose: () => void;
  onExited?: () => void;
  open: boolean;
  /** useDialog 的单调会话 id：重开同一目标也重建全新表单。 */
  session: number;
  target: ReplyTarget | null;
}) => {
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
      {target ? (
        <ReplyForm
          key={session}
          onSent={() => {
            onClose();
          }}
          target={target}
        />
      ) : null}
    </AppDialog>
  );
};
