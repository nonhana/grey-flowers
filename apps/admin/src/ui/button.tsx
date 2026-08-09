import type { ComponentProps, ReactNode } from 'react';

import { cn } from 'cnfast';
import { Loader2 } from 'lucide-react';
import { Button as AriaButton } from 'react-aria-components';

/**
 * 字盘层的按钮。整个后台只有这五种，没有第六种。
 *
 *   solid   —— 提交。一屏之内至多一枚，它就是这一屏的目的。
 *   quiet   —— 次级操作。有形但不争。
 *   ghost   —— 工具条、图标动作。静止时只是文字。
 *   danger  —— 破坏性动作的确认端。
 *   warnish —— 破坏性动作的入口（描边，不实心，避免误触感）。
 */
export type ButtonTone = 'solid' | 'quiet' | 'ghost' | 'danger' | 'warnish';

export type ButtonSize = 'sm' | 'md' | 'lg';

const TONE: Record<ButtonTone, string> = {
  solid:
    'border-transparent bg-accent text-accent-on hover:not-disabled:bg-accent-hover',
  quiet:
    'border-edge bg-case-raised text-ink hover:not-disabled:border-edge-hover hover:not-disabled:bg-accent-wash hover:not-disabled:text-accent-text',
  ghost:
    'border-transparent bg-transparent text-ink-dim hover:not-disabled:bg-accent-wash hover:not-disabled:text-accent-text',
  danger:
    'border-transparent bg-danger text-danger-on hover:not-disabled:bg-danger-hover',
  warnish:
    'border-danger-rule bg-transparent text-danger-text hover:not-disabled:bg-danger-wash',
};

const SIZE: Record<ButtonSize, string> = {
  sm: 'min-h-8 gap-1.5 px-2.5 text-xs [&_svg]:size-3.5',
  md: 'min-h-10 gap-2 px-3.5 text-base [&_svg]:size-4',
  lg: 'min-h-11 gap-2 px-4 text-base [&_svg]:size-4',
};

const BASE = cn(
  'inline-flex shrink-0 items-center justify-center rounded-control border',
  'font-mono leading-none whitespace-nowrap transition-colors duration-150',
  `
    disabled:opacity-45
    disabled:hover:bg-transparent
  `,
);

/**
 * 给「其实是链接、但要长得像按钮」的场合用（导航到新建、空状态里的跳转等），
 * 避免把 <button> 套进 <a> 里造成嵌套可交互元素。
 */
export const buttonClass = ({
  className,
  size = 'md',
  tone = 'quiet',
}: {
  className?: string;
  size?: ButtonSize;
  tone?: ButtonTone;
} = {}) => cn(BASE, SIZE[size], TONE[tone], className);

interface ButtonProps extends Omit<
  ComponentProps<typeof AriaButton>,
  'className' | 'children'
> {
  children?: ReactNode;
  className?: string;
  /** 前置图标；loading 时会被替换成转圈。 */
  icon?: ReactNode;
  isLoading?: boolean;
  size?: ButtonSize;
  tone?: ButtonTone;
}

export const Button = ({
  children,
  className,
  icon,
  isDisabled,
  isLoading = false,
  size = 'md',
  tone = 'quiet',
  ...rest
}: ButtonProps) => (
  <AriaButton
    className={buttonClass({ className, size, tone })}
    isDisabled={isDisabled === true || isLoading}
    {...rest}
  >
    {isLoading ? <Loader2 aria-hidden className="animate-spin" /> : icon}
    {children}
  </AriaButton>
);

const ICON_SIZE: Record<ButtonSize, string> = {
  sm: 'size-8 [&_svg]:size-4',
  md: 'size-10 [&_svg]:size-4.5',
  lg: 'size-11 [&_svg]:size-5',
};

interface IconButtonProps extends Omit<
  ComponentProps<typeof AriaButton>,
  'className' | 'children'
> {
  /** 图标按钮没有可见文字，label 同时作为 aria-label 与 tooltip 文案。 */
  label: string;
  children: ReactNode;
  className?: string;
  size?: ButtonSize;
  tone?: ButtonTone;
}

export const IconButton = ({
  children,
  className,
  label,
  size = 'md',
  tone = 'ghost',
  ...rest
}: IconButtonProps) => (
  <AriaButton
    aria-label={label}
    className={cn(
      'inline-grid shrink-0 place-items-center rounded-control border',
      `
        transition-colors duration-150
        disabled:opacity-45
      `,
      ICON_SIZE[size],
      TONE[tone],
      className,
    )}
    {...rest}
  >
    {children}
  </AriaButton>
);
