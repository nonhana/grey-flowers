import type { ReactNode } from 'react';

import { SectionLabel, Skeleton } from '@/ui/index.js';

/**
 * 计数抽屉。
 *
 * 六个并列的数不是六张卡。六张同尺寸的描边圆角卡片会把「一行读数」说成
 * 「一副牌」——这正是 PRODUCT.md 点名拒绝的 homogeneous card mush。
 * 字盘的列表原语是一只描边抽屉，内部靠发丝分格：`gap-px` 露出容器底色
 * 就是那些发丝，格子换行时分隔线自动跟着走，不用手写 border 方向。
 */
export const ReadoutDrawer = ({ children }: { children: ReactNode }) => (
  <div
    className="
      grid grid-cols-2 gap-px overflow-hidden rounded-panel border border-rule
      bg-rule
      sm:grid-cols-3
      xl:grid-cols-6
    "
  >
    {children}
  </div>
);

/**
 * 一个格眼：标签、数、副行。
 * 数用 text-xl 而不是 text-2xl —— 2xl 是页标题的尺寸，六个数并排顶到那一档，
 * 页面的主语就被抢走了（DESIGN.md：标题必须是这一屏最大的东西）。
 */
export const ReadoutCell = ({
  icon,
  label,
  secondary,
  value,
}: {
  icon: ReactNode;
  label: string;
  secondary: string;
  value: string;
}) => (
  <div className="grid content-start gap-1.5 bg-case-raised p-4">
    <div className="flex items-center justify-between gap-2">
      <SectionLabel>{label}</SectionLabel>
      <span
        aria-hidden="true"
        className="
          shrink-0 text-ink-dim
          [&_svg]:size-4
        "
      >
        {icon}
      </span>
    </div>
    <p className="font-mono text-xl font-medium text-ink-strong">{value}</p>
    {/* 不截断：副行被切成「已发布 972…」时它就不再是信息了。让它换行。 */}
    <p className="font-mono text-2xs/snug text-ink-dim">{secondary}</p>
  </div>
);

/** 骨架与真实格眼同高同节奏，数据落地时抽屉不跳。 */
export const ReadoutDrawerSkeleton = () => (
  <ReadoutDrawer>
    {Array.from({ length: 6 }, (_, index) => (
      <div
        className="grid content-start gap-1.5 bg-case-raised p-4"
        key={index}
      >
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-3 w-full" />
      </div>
    ))}
  </ReadoutDrawer>
);
