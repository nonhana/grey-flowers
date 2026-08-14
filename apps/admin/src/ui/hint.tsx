import type { ReactNode } from 'react';

import { cn } from 'cnfast';
import { Tooltip as AriaTooltip, TooltipTrigger } from 'react-aria-components';

/**
 * 工具提示：悬停/聚焦时延迟展示轻量说明文案。
 *
 * 独立成模块（而非挂在 ui/overlay 里）是为了让 shell 入口不因此拉入
 * react-modal-sheet / motion 等重模块 —— ui/overlay 只留给真正需要
 * 弹层 / 抽屉 / 确认框的场景。见 wiki/plans/2026-08-10-admin-pwa-refactor.md 交接 P2。
 */
export const Hint = ({
  children,
  label,
  placement = 'bottom',
}: {
  children: ReactNode;
  label: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}) => (
  <TooltipTrigger delay={350}>
    {children}
    <AriaTooltip
      className={cn(
        'rounded-control bg-ink-strong px-2 py-1 font-mono text-2xs text-canvas',
        `
          shadow-float
          data-entering:animate-pop-in
        `,
      )}
      offset={6}
      placement={placement}
    >
      {label}
    </AriaTooltip>
  </TooltipTrigger>
);
