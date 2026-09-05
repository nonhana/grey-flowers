import type { CommentAdmin, CommentAdminTree } from '@grey-flowers/contracts';

import { cn } from 'cn';
import {
  ExternalLink,
  MessageSquareReply,
  MessageSquareText,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';

import { formatDateTime } from '@/lib/format';
import { IconButton } from '@/ui/button';
import { Skeleton } from '@/ui/feedback';
import { AssetImage } from '@/ui/image';
import { MetaLine } from '@/ui/surface';

import { commentPageUrl } from './display';

export const CommentBody = ({
  actions,
  author,
  comment,
  isChild = false,
}: {
  actions: {
    onOpenSession?: () => void;
    onReply: () => void;
    onDelete: () => void;
  };
  author: Pick<
    CommentAdmin['author'],
    'avatar' | 'email' | 'role' | 'username'
  >;
  comment: Pick<
    CommentAdmin,
    | 'content'
    | 'editedAt'
    | 'id'
    | 'path'
    | 'publishedAt'
    | 'replyToComment'
    | 'replyToUser'
  >;
  isChild?: boolean;
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="min-w-0 flex-1">
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={cn(
            'grid size-6 shrink-0 overflow-hidden rounded-full bg-well',
            isChild && 'size-5',
          )}
        >
          <AssetImage
            alt=""
            className="size-full object-cover"
            src={author.avatar}
          />
        </span>
        <span className="truncate text-base text-ink-strong">
          {author.username}
        </span>
        {author.role === 'ADMIN' ? (
          <span
            className="
              shrink-0 rounded-sm border border-accent-rule px-1 font-mono
              text-2xs text-accent-text
            "
          >
            ADMIN
          </span>
        ) : null}
        <span
          className="truncate font-mono text-2xs text-ink-dim"
          title={author.email}
        >
          {author.email}
        </span>
        <span className="ml-auto shrink-0 font-mono text-2xs text-ink-dim">
          {formatDateTime(comment.publishedAt)}
        </span>
      </div>

      <MetaLine className="mt-1.5">
        <span
          className="max-w-56 truncate font-mono text-2xs text-ink-dim"
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
      </MetaLine>

      {comment.replyToComment ? (
        <p
          className="
            mt-2 line-clamp-2 rounded-control bg-well px-2.5 py-1.5 text-xs
            text-ink-dim
          "
        >
          回复了 {comment.replyToUser?.username ?? '用户'}：
          {comment.replyToComment.content}
        </p>
      ) : comment.replyToUser ? (
        <p
          className="
            mt-2 rounded-control bg-well px-2.5 py-1.5 text-xs text-ink-dim
          "
        >
          回复了 {comment.replyToUser.username}
        </p>
      ) : null}

      {comment.content ? (
        <p
          className={cn(
            'mt-2 text-base/relaxed whitespace-pre-line text-ink',
            !expanded && 'line-clamp-3',
          )}
        >
          {comment.content}
        </p>
      ) : null}
      {comment.content.length > 120 ? (
        <button
          className="mt-1 font-mono text-2xs text-accent-text"
          onClick={() => setExpanded((current) => !current)}
          type="button"
        >
          {expanded ? '收起' : '展开全文'}
        </button>
      ) : null}

      <MetaLine className="mt-2">
        <span className="flex shrink-0 gap-1">
          {actions.onOpenSession ? (
            <IconButton
              label={`查看评论 #${String(comment.id)} 的会话`}
              onPress={actions.onOpenSession}
              size="sm"
              tone="quiet"
            >
              <MessageSquareText aria-hidden />
            </IconButton>
          ) : null}
          <IconButton
            label={`回复评论 #${String(comment.id)}`}
            onPress={actions.onReply}
            size="sm"
            tone="quiet"
          >
            <MessageSquareReply aria-hidden />
          </IconButton>
          <IconButton
            label={`删除评论 #${String(comment.id)}`}
            onPress={actions.onDelete}
            size="sm"
            tone="warnish"
          >
            <Trash2 aria-hidden />
          </IconButton>
        </span>
      </MetaLine>
    </div>
  );
};

/**
 * 列表卡片：一条 PARENT + 勾选 + 其 children 归并展示。
 * 回复/删除对 PARENT 与 CHILD 均可用（按目标回调，交给调用方区分弹窗）。
 */
export const CommentCard = ({
  actions,
  comment,
  onToggleSelect,
  selected,
}: {
  actions: {
    onOpenSession: () => void;
    onReply: (target: CommentAdmin) => void;
    onDelete: (target: CommentAdmin) => void;
  };
  comment: CommentAdminTree;
  onToggleSelect: () => void;
  selected: boolean;
}) => (
  <article
    className={cn(
      'grid gap-3 rounded-panel border border-rule bg-case-raised p-4',
      'transition-colors',
      selected && 'border-accent-rule',
    )}
  >
    <div className="flex items-start gap-3">
      <input
        aria-label={`选择评论 #${String(comment.id)} 及其全部回复`}
        checked={selected}
        className="mt-1 size-4.5 shrink-0 accent-accent"
        onChange={onToggleSelect}
        type="checkbox"
      />

      <CommentBody
        actions={{
          onDelete: () => actions.onDelete(comment),
          onOpenSession: actions.onOpenSession,
          onReply: () => actions.onReply(comment),
        }}
        author={comment.author}
        comment={comment}
      />
    </div>

    {comment.children.length > 0 ? (
      <div className="ml-7 grid gap-2.5 border-l border-rule pl-3.5">
        {comment.children.map((child) => (
          <CommentBody
            actions={{
              onDelete: () => actions.onDelete(child),
              onReply: () => actions.onReply(child),
            }}
            author={child.author}
            comment={child}
            isChild
            key={child.id}
          />
        ))}
      </div>
    ) : null}

    {comment.childrenCount > 0 ? (
      <MetaLine className="border-t border-rule pt-2">
        <span className="font-mono text-2xs text-ink-dim">
          {comment.childrenCount} 条回复
        </span>
      </MetaLine>
    ) : null}
  </article>
);

/**
 * 与真实评论卡同构的骨架：勾选位 + 作者行（头像/名/邮箱/时间）+ path 行 +
 * 三行正文 + 操作位。children 区数量不定，不画 —— 取无回复的最常见形态。
 * 块高按真实字号的 line-height 取 em，落地时行高与真实逐段相等。
 */
export const CommentCardSkeleton = () => (
  <article
    aria-hidden
    className="grid gap-3 rounded-panel border border-rule bg-case-raised p-4"
  >
    <div className="flex items-start gap-3">
      <Skeleton className="mt-1 size-4.5 shrink-0 rounded-sm" />
      <div className="min-w-0 flex-1">
        {/* 作者行：头像 24px 主导行高 */}
        <div className="flex min-w-0 items-center gap-2">
          <Skeleton className="size-6 shrink-0 rounded-full" />
          <Skeleton className="h-[1.55em] w-28 text-base" />
          <Skeleton className="h-[1.45em] w-40 text-2xs" />
          <Skeleton className="ml-auto h-[1.45em] w-24 text-2xs" />
        </div>
        <MetaLine className="mt-1.5">
          <Skeleton className="h-[1.45em] w-56 text-2xs" />
          <Skeleton className="h-[1.45em] w-4 text-2xs" />
        </MetaLine>
        {/* 正文三行：text-base/relaxed → lh 1.625 */}
        <div className="mt-2 grid gap-1.5">
          <Skeleton className="h-[1.625em] w-full text-base" />
          <Skeleton className="h-[1.625em] w-4/5 text-base" />
          <Skeleton className="h-[1.625em] w-2/3 text-base" />
        </div>
        <MetaLine className="mt-2">
          <span className="flex shrink-0 gap-1">
            <Skeleton className="size-8 rounded-control" />
            <Skeleton className="size-8 rounded-control" />
            <Skeleton className="size-8 rounded-control" />
          </span>
        </MetaLine>
      </div>
    </div>
  </article>
);
