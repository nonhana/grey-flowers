import type { ReactNode } from 'react';

import { Tooltip as AriaTooltip, TooltipTrigger } from 'react-aria-components';

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
      className="
        rounded-control bg-ink-strong px-2 py-1 font-mono text-2xs text-canvas
        shadow-float
        data-entering:animate-pop-in
      "
      offset={6}
      placement={placement}
    >
      {label}
    </AriaTooltip>
  </TooltipTrigger>
);
