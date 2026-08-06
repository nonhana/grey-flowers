import type { CommentAdmin, CommentAdminTree } from '@grey-flowers/contracts';

import { ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { Form } from 'react-aria-components';
import { toast } from 'sonner';

import { apiClient } from '@/app/api/index.js';
import { toastError } from '@/lib/toast.js';
import { AppDialog, Button, MetaLine, TextAreaField } from '@/ui/index.js';

import { CommentBody } from './comment-card.js';
import { commentPageUrl } from './display.js';

/**
 * 会话视图 = 查看评论上下文的载体：同 path 会话树（PARENT + 全部 CHILD）。
 * 头部给 path 面包屑 + 「在访客页打开」外链 + 总条数；底部最小回复框快捷回复 PARENT；
 * 每行复用 CommentBody 的行内操作（回复/删除），由调用方挂接共享弹窗。
 */
export const SessionDialog = ({
  comment,
  onChanged,
  onClose,
  onDelete,
  onReply,
}: {
  comment: CommentAdminTree | null;
  onChanged: () => void;
  onClose: () => void;
  onDelete: (target: CommentAdmin) => void;
  onReply: (target: CommentAdmin) => void;
}) => {
  const [quickContent, setQuickContent] = useState('');
  const [sending, setSending] = useState(false);

  // 打开时同步内容（渲染期、受条件保护地调整 state）
  const [prevCommentId, setPrevCommentId] = useState<number | null>(null);
  if (comment && prevCommentId !== comment.id) {
    setPrevCommentId(comment.id);
    setQuickContent('');
  }

  const sendQuickReply = async () => {
    if (!comment) return;
    const body = quickContent.trim();
    if (!body) return;

    setSending(true);
    try {
      await apiClient.comments.reply(comment.id, { content: body });
      setQuickContent('');
      onChanged();
      toast.success(`已回复，将通知 ${comment.author.username}`);
    } catch (error) {
      toastError(error);
    } finally {
      setSending(false);
    }
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
                isLoading={sending}
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
      isOpen={comment !== null}
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
              <ExternalLink aria-hidden="true" className="size-3" />
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
