import type {
  CommentAdmin,
  UserAdminDetailData,
  UserAdminSummary,
} from '@grey-flowers/contracts';

import { useQuery } from '@tanstack/react-query';
import { CloudOff, ExternalLink, MessagesSquare } from 'lucide-react';
import { useState } from 'react';

import { usersDetailOptions } from '@/app/server-state/users.js';
import { formatDateTime } from '@/lib/format.js';
import { pageUrl } from '@/lib/page-url.js';
import { Button } from '@/ui/button.js';
import { EmptyState, Skeleton } from '@/ui/feedback.js';
import { AssetImage } from '@/ui/image.js';
import { AppDialog } from '@/ui/overlay.js';
import { Paginator } from '@/ui/paginator.js';
import { MetaLine } from '@/ui/surface.js';

const COMMENT_PAGE_SIZE = 10;

const CommentRow = ({ comment }: { comment: CommentAdmin }) => (
  <article className="grid gap-1.5">
    <MetaLine>
      <span
        className="max-w-64 truncate font-mono text-2xs text-ink-dim"
        title={comment.path}
      >
        {comment.path}
      </span>
      <span className="shrink-0 font-mono text-2xs text-ink-dim">
        {formatDateTime(comment.publishedAt)}
      </span>
      <a
        aria-label="在访客页打开"
        className="
          inline-flex shrink-0 items-center gap-0.5 font-mono text-2xs
          text-ink-dim transition-colors
          hover:text-accent-text
        "
        href={pageUrl(comment.path)}
        rel="noreferrer noopener"
        target="_blank"
      >
        <ExternalLink aria-hidden className="size-3" />
      </a>
    </MetaLine>

    {comment.replyToUser ? (
      <p className="truncate font-mono text-2xs text-ink-dim">
        回复了
        <span className="text-accent-text">
          @{comment.replyToUser.username}
        </span>
        {comment.replyToComment ? `：${comment.replyToComment.content}` : ''}
      </p>
    ) : null}

    <p className="line-clamp-3 text-base/relaxed whitespace-pre-line text-ink">
      {comment.content}
    </p>
  </article>
);

/**
 * 与 CommentRow 同构的骨架：path 行 + 三行正文（引用行可有可无，不画）。
 * 块高按真实字号的 line-height 取 em，落地时行高与真实相等。
 */
const CommentRowSkeleton = () => (
  <article aria-hidden className="grid gap-1.5">
    <Skeleton className="h-[1.45em] w-2/3 text-2xs" />
    <Skeleton className="h-[1.45em] w-10 text-2xs" />
    <Skeleton className="h-[1.45em] w-full text-base" />
    <Skeleton className="h-[1.45em] w-full text-base" />
    <Skeleton className="h-[1.45em] w-3/4 text-base" />
  </article>
);

/** 单次打开会话内的详情体：评论页码构成 query key，翻页/重试都由 Query 驱动。 */
const DetailBody = ({ user }: { user: UserAdminSummary }) => {
  const [commentPage, setCommentPage] = useState(1);

  const detailQuery = useQuery(
    usersDetailOptions(user.id, {
      commentPage,
      commentPageSize: COMMENT_PAGE_SIZE,
    }),
  );
  const data: UserAdminDetailData | undefined = detailQuery.data;
  const loading = detailQuery.isFetching;
  const error = detailQuery.error ? '无法加载用户详情，请稍后重试。' : '';

  const totalComments = data?.comments.total ?? 0;
  const totalPages = data
    ? Math.max(1, Math.ceil(data.comments.total / COMMENT_PAGE_SIZE))
    : 1;

  return (
    <div className="grid gap-4">
      <section aria-busy={loading} className="grid gap-4">
        <h3 className="font-mono text-xs text-ink-dim">评论历史</h3>

        {loading ? (
          <div className="grid animate-content-in gap-4" key="skeleton">
            {Array.from({ length: 4 }, (_, index) => (
              <CommentRowSkeleton key={index} />
            ))}
          </div>
        ) : error ? (
          <EmptyState
            action={
              <Button onPress={() => void detailQuery.refetch()} size="sm">
                重试
              </Button>
            }
            icon={<CloudOff aria-hidden />}
            title="没能连上评论历史"
          >
            {error}
          </EmptyState>
        ) : data && data.comments.items.length === 0 ? (
          <EmptyState icon={<MessagesSquare aria-hidden />} title="还没有评论">
            该用户发布评论后会显示在这里。
          </EmptyState>
        ) : (
          <div className="grid animate-content-in gap-4" key="content">
            {data?.comments.items.map((comment) => (
              <CommentRow comment={comment} key={comment.id} />
            ))}
          </div>
        )}

        {data ? (
          <Paginator
            onChange={setCommentPage}
            page={commentPage}
            total={totalComments}
            totalPages={totalPages}
            unit="条"
          />
        ) : null}
      </section>
    </div>
  );
};

/**
 * 用户详情：资料头 + 分页评论历史（复用 commentAdminSchema 投影）。
 * 只读视图，编辑/删除走列表卡片操作。
 */
export const UserDetailDialog = ({
  onClose,
  onExited,
  open,
  session,
  user,
}: {
  onClose: () => void;
  onExited?: () => void;
  open: boolean;
  /** useDialog 的单调会话 id：重开/切换用户都从第 1 页重新开始。 */
  session: number;
  user: UserAdminSummary | null;
}) => {
  return (
    <AppDialog
      isOpen={open}
      onExited={onExited}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      size="lg"
      title="用户详情"
    >
      {user ? (
        <div className="grid gap-5">
          <div className="flex min-w-0 items-center gap-4">
            <span
              className="
                grid size-16 shrink-0 overflow-hidden rounded-full bg-well
              "
            >
              <AssetImage
                alt=""
                className="size-full object-cover"
                src={user.avatar}
              />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-base text-ink-strong">
                  {user.username}
                </span>
                {user.role === 'ADMIN' ? (
                  <span
                    className="
                      shrink-0 rounded-sm border border-accent-rule px-1
                      font-mono text-2xs text-accent-text
                    "
                  >
                    ADMIN
                  </span>
                ) : null}
              </div>
              <MetaLine className="mt-1">
                <span className="truncate font-mono text-2xs text-ink-dim">
                  {user.email}
                </span>
                {user.site ? (
                  <a
                    aria-label="访问用户主页"
                    className="
                      inline-flex shrink-0 items-center gap-0.5 font-mono
                      text-2xs text-ink-dim transition-colors
                      hover:text-accent-text
                    "
                    href={user.site}
                    rel="noreferrer noopener"
                    target="_blank"
                  >
                    <ExternalLink aria-hidden className="size-3" />
                    主页
                  </a>
                ) : null}
                <span className="shrink-0 font-mono text-2xs text-ink-dim">
                  注册于 {formatDateTime(user.createdAt)}
                </span>
                <span
                  className="
                    shrink-0 rounded-sm bg-well px-1.5 py-0.5 font-mono text-2xs
                    text-ink-dim
                  "
                >
                  共 {user.commentCount} 条评论
                </span>
              </MetaLine>
            </div>
          </div>

          <DetailBody key={session} user={user} />
        </div>
      ) : null}
    </AppDialog>
  );
};
