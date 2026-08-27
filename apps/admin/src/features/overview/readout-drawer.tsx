import type { ReactNode } from 'react';

import { Skeleton } from '@/ui/feedback.js';
import { SectionLabel } from '@/ui/surface.js';

/** 计数抽屉（不是六张卡——那是 PRODUCT.md 拒绝的 card mush）：gap-px 露出底色做发丝分格。 */
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

/** 格眼：数用 text-xl 而非 text-2xl——2xl 是页标题档位，标题必须是这屏最大的东西。 */
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
        aria-hidden
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

/** 骨架副行按两行占位：网格排高由最高格决定，落地后至少一格占满两行，高度不变。 */
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
        </div>
      </div>
    ))}
  </ReadoutDrawer>
);
