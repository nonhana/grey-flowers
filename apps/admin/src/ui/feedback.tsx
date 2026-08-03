import type { ReactNode } from 'react';

import { cn } from 'cnfast';
import { AlertTriangle, Info, Loader2, OctagonAlert } from 'lucide-react';

export type Tone = 'danger' | 'warn' | 'info';

const ALERT_TONE: Record<Tone, string> = {
  danger: 'border-danger-rule bg-danger-wash text-danger-text',
  warn: 'border-warn-rule bg-warn-wash text-warn-text',
  info: 'border-accent-rule bg-accent-wash text-accent-text',
};

const ALERT_ICON: Record<Tone, typeof Info> = {
  danger: OctagonAlert,
  warn: AlertTriangle,
  info: Info,
};

/**
 * 提示条。用整块淡底 + 1px 描边区分，不用彩色粗左边条 —— 那是装饰不是信息。
 */
export const Alert = ({
  action,
  children,
  className,
  tone = 'danger',
}: {
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  tone?: Tone;
}) => {
  const Icon = ALERT_ICON[tone];

  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-control border px-3 py-2.5',
        'text-base/relaxed',
        ALERT_TONE[tone],
        className,
      )}
      role="alert"
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
};

/**
 * 空状态要教会界面怎么用，而不是说「这里没有东西」。
 */
export const EmptyState = ({
  action,
  children,
  hint,
  icon,
  title,
}: {
  action?: ReactNode;
  children?: ReactNode;
  hint?: string;
  icon: ReactNode;
  title: string;
}) => (
  <div
    className="
      grid justify-items-center gap-3 rounded-panel border border-dashed
      border-edge px-6 py-14 text-center
    "
  >
    <span
      aria-hidden="true"
      className="
        grid size-11 place-items-center rounded-full bg-accent-wash
        text-accent-text
        [&_svg]:size-5
      "
    >
      {icon}
    </span>
    <p className="text-md font-bold text-ink-strong">{title}</p>
    {children ? (
      <p className="max-w-sm text-base/relaxed text-ink-dim">{children}</p>
    ) : null}
    {action ? <div className="mt-1">{action}</div> : null}
    {hint ? <p className="font-mono text-2xs text-ink-dim">{hint}</p> : null}
  </div>
);

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn('animate-pulse rounded-control bg-rule', className)} />
);

/** 列表骨架。加载时保持与真实内容相同的行高，避免加载完成时页面跳动。 */
export const RowSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div
    aria-hidden="true"
    className="
      overflow-hidden rounded-panel border border-rule bg-case-raised
      [&>*+*]:border-t [&>*+*]:border-rule
    "
  >
    {Array.from({ length: rows }, (_, index) => (
      <div className="grid gap-2 px-4 py-3.5" key={index}>
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-2.5 w-1/4" />
      </div>
    ))}
  </div>
);

export const Spinner = ({
  className,
  label,
}: {
  className?: string;
  label: string;
}) => (
  <span
    className={cn('inline-flex items-center gap-2 text-ink-dim', className)}
    role="status"
  >
    <Loader2 aria-hidden="true" className="size-4 animate-spin" />
    <span className="font-mono text-xs">{label}</span>
  </span>
);

/**
 * 发布状态。文字本身已经说清楚，颜色只是补强，不作为唯一信号。
 */
export const PublishBadge = ({ published }: { published: boolean }) => (
  <span
    className={cn(
      `
        inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5
        py-0.5
      `,
      'font-mono text-2xs',
      published
        ? 'border-accent-rule bg-accent-wash text-accent-text'
        : 'border-edge text-ink-dim',
    )}
  >
    <span
      aria-hidden="true"
      className={cn(
        'size-1.5 rounded-full',
        published ? 'bg-accent' : 'bg-ink-dim',
      )}
    />
    {published ? '已发布' : '草稿'}
  </span>
);

export type ReadoutTone = 'ok' | 'busy' | 'warn' | 'err';

const READOUT_TONE: Record<ReadoutTone, string> = {
  ok: 'border-accent-rule bg-accent-wash text-accent-text',
  busy: 'border-edge bg-well text-ink-dim',
  warn: 'border-warn-rule bg-warn-wash text-warn-text',
  err: 'border-danger-rule bg-danger-wash text-danger-text',
};

/**
 * 状态读数屏：一次只报一个值。
 * 取代原先那一排各说各话的 chip。
 */
export const StatusReadout = ({
  icon,
  label,
  tone,
}: {
  icon?: ReactNode;
  label: string;
  tone: ReadoutTone;
}) => (
  <span
    className={cn(
      'inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5',
      `
        font-mono text-2xs whitespace-nowrap
        [&_svg]:size-3.5
      `,
      READOUT_TONE[tone],
    )}
  >
    {icon}
    <span aria-live="polite">{label}</span>
  </span>
);
