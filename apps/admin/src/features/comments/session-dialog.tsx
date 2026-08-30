import type { CommentAdmin, CommentAdminTree } from '@grey-flowers/contracts';

import { useMutation } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { Form } from 'react-aria-components';
import { toast } from 'sonner';

import { apiClient } from '@/app/api/index.js';
import { invalidateCommentsAfterMutation } from '@/app/server-state/comments.js';
import { toastError } from '@/lib/toast.js';
import { Button } from '@/ui/button.js';
import { TextAreaField } from '@/ui/form.js';
import { AppDialog } from '@/ui/overlay.js';
import { MetaLine } from '@/ui/surface.js';

import { CommentBody } from './comment-card.js';
import { commentPageUrl } from './display.js';

/**
 * 会话视图 = 查看评论上下文的载体：同 path 会话树（PARENT + 全部 CHILD）。
 * 头部给 path 面包屑 + 「在访客页打开」外链 + 总条数；底部最小回复框快捷回复 PARENT；
 * 每行复用 CommentBody 的行内操作（回复/删除），由调用方挂接共享弹窗。
 */
export const SessionDialog = ({
  comment,
  onClose,
  onDelete,
  onExited,
  onReply,
  open,
}: {
  comment: CommentAdminTree | null;
  onClose: () => void;
  onDelete: (target: CommentAdmin) => void;
  onExited?: () => void;
  onReply: (target: CommentAdmin) => void;
  open: boolean;
}) => {
  const [quickContent, setQuickContent] = useState('');

  // 打开时同步内容（渲染期、受条件保护地调整 state）
  const [prevCommentId, setPrevCommentId] = useState<number | null>(null);
  if (comment && prevCommentId !== comment.id) {
    setPrevCommentId(comment.id);
    setQuickContent('');
  }

  const replyMutation = useMutation({
    mutationFn: (body: string) => {
      if (!comment) return Promise.reject(new Error('no comment'));
      return apiClient.comments.reply(comment.id, { content: body });
    },
    onSuccess: async () => {
      setQuickContent('');
      toast.success(`已回复，将通知 ${comment?.author.username ?? '作者'}`);
      await invalidateCommentsAfterMutation();
    },
    onError: (error) => {
      toastError(error);
    },
  });

  const sendQuickReply = () => {
    if (!comment) return;
    const body = quickContent.trim();
    if (!body) return;
    replyMutation.mutate(body);
  };

  const sessionCount = comment ? 1 + comment.childrenCount : 0;

  return (
    <AppDialog
      footer={
        comment ? (
          <Form
            className="grid w-full gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void sendQuickReply();
            }}
          >
            <TextAreaField
              label="向这条评论回复"
              onChange={setQuickContent}
              placeholder="向这条评论回复…"
              rows={2}
              value={quickContent}
            />
            <div className="flex justify-end">
              <Button
                isDisabled={!quickContent.trim()}
                isLoading={replyMutation.isPending}
                size="sm"
                tone="solid"
                type="submit"
              >
                发送
              </Button>
            </div>
          </Form>
        ) : undefined
      }
      isOpen={open}
      onExited={onExited}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      size="lg"
      title="评论会话"
    >
      {comment ? (
        <div className="grid gap-5">
          <MetaLine>
            <span
              className="max-w-64 truncate font-mono text-2xs text-ink-dim"
              title={comment.path}
            >
              {comment.path}
            </span>
            <a
              aria-label="在访客页打开"
              className="
                inline-flex items-center gap-0.5 font-mono text-2xs text-ink-dim
                transition-colors
                hover:text-accent-text
              "
              href={commentPageUrl(comment.path)}
              rel="noreferrer noopener"
              target="_blank"
            >
              <ExternalLink aria-hidden className="size-3" />
            </a>
            <span className="ml-auto font-mono text-2xs text-ink-dim">
              共 {sessionCount} 条
            </span>
          </MetaLine>

          <CommentBody
            actions={{
              onDelete: () => onDelete(comment),
              onReply: () => onReply(comment),
            }}
            author={comment.author}
            comment={comment}
          />

          {comment.children.length > 0 ? (
            <div className="grid gap-3 border-l border-rule pl-4">
              {comment.children.map((child) => (
                <CommentBody
                  actions={{
                    onDelete: () => onDelete(child),
                    onReply: () => onReply(child),
                  }}
                  author={child.author}
                  comment={child}
                  isChild
                  key={child.id}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </AppDialog>
  );
};
