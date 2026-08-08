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
  secondary?: string;
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
    {/* 副行最多两行：三行会把格子顶得参差，骨架按两行占位后整排高度就锁死了。
        超出部分截断 —— 两行内足够承载「类别 · 数量」这类完整信息。 */}
    {secondary && (
      <p className="line-clamp-2 font-mono text-2xs/snug text-ink-dim">
        {secondary}
      </p>
    )}
  </div>
);

/**
 * 骨架与真实格眼同高同节奏：label 行（含图标位）、数值行、副行按两行占位。
 * 副行取最大高度 —— 网格整排高度由最高格决定，内容落地后至少一格占满两行，
 * 排高即保持不变。
 */
export const ReadoutDrawerSkeleton = () => (
  <ReadoutDrawer>
    {Array.from({ length: 6 }, (_, index) => (
      <div
        className="grid content-start gap-1.5 bg-case-raised p-4"
        key={index}
      >
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-[1.45em] w-12 text-xs" />
          <Skeleton className="size-4" />
        </div>
        <Skeleton className="h-[1.3em] w-16 text-xl" />
        <div className="grid">
          <Skeleton className="h-[1.375em] w-full text-2xs" />
          <Skeleton className="h-[1.375em] w-3/4 text-2xs" />
        </div>
      </div>
    ))}
  </ReadoutDrawer>
);
