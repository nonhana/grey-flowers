import type { UserAdminSummary } from '@grey-flowers/contracts';

import { ExternalLink, Pencil, Trash2, UserRound } from 'lucide-react';

import { formatDateTime } from '@/lib/format.js';
import { AssetImage, IconButton, MetaLine } from '@/ui/index.js';

/** 用户列表卡片：头像 + 用户名/邮箱/ADMIN Pin + 注册时间 + 「N 条评论」角标 + 操作。 */
export const UserCard = ({
  actions,
  user,
}: {
  actions: {
    onDelete: () => void;
    onDetail: () => void;
    onEdit: () => void;
  };
  user: UserAdminSummary;
}) => (
  <article className="grid gap-3 rounded-panel border border-rule bg-case-raised p-4">
    <div className="flex min-w-0 items-center gap-3">
      <span className="grid size-10 shrink-0 overflow-hidden rounded-full bg-well">
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
                shrink-0 rounded-sm border border-accent-rule px-1 font-mono
                text-2xs text-accent-text
              "
            >
              ADMIN
            </span>
          ) : null}
          <span
            className="min-w-0 truncate font-mono text-2xs text-ink-dim"
            title={user.email}
          >
            {user.email}
          </span>
        </div>

        <MetaLine className="mt-1">
          <span className="shrink-0 font-mono text-2xs text-ink-dim">
            {formatDateTime(user.createdAt)}
          </span>
          <span
            className="
              shrink-0 rounded-sm bg-well px-1.5 py-0.5 font-mono text-2xs
              text-ink-dim
            "
          >
            {user.commentCount} 条评论
          </span>
          {user.site ? (
            <a
              aria-label="访问用户主页"
              className="
                inline-flex items-center gap-0.5 font-mono text-2xs text-ink-dim
                transition-colors
                hover:text-accent-text
              "
              href={user.site}
              rel="noreferrer noopener"
              target="_blank"
            >
              <ExternalLink aria-hidden="true" className="size-3" />
              主页
            </a>
          ) : null}
        </MetaLine>
      </div>

      <span className="flex shrink-0 gap-1">
        <IconButton
          label="查看详情"
          onPress={actions.onDetail}
          size="sm"
          tone="quiet"
        >
          <UserRound aria-hidden="true" />
        </IconButton>
        <IconButton
          label="编辑用户"
          onPress={actions.onEdit}
          size="sm"
          tone="quiet"
        >
          <Pencil aria-hidden="true" />
        </IconButton>
        <IconButton
          label="删除用户"
          onPress={actions.onDelete}
          size="sm"
          tone="warnish"
        >
          <Trash2 aria-hidden="true" />
        </IconButton>
      </span>
    </div>
  </article>
);
