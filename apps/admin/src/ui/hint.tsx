import type { ReactNode } from 'react';

import { cn } from 'cn';
import { Tooltip as AriaTooltip, TooltipTrigger } from 'react-aria-components';

/**
 * 工具提示：独立成模块，让 shell 入口不拉入 react-modal-sheet/motion 等重模块
 * （见 wiki/plans 交接 P2）。
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
