import type { ComponentProps, ReactNode } from 'react';

import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from 'cn';
import { Loader2 } from 'lucide-react';
import { Button as AriaButton } from 'react-aria-components';

export const buttonVariants = cva(
  `
    shrink-0 rounded-control border font-mono leading-none whitespace-nowrap
    transition-colors duration-150
    disabled:opacity-45
    disabled:hover:bg-transparent
  `,
  {
    variants: {
      tone: {
        solid: `
          border-transparent bg-accent text-accent-on
          hover:not-disabled:bg-accent-hover
        `,
        quiet: `
          border-edge bg-case-raised text-ink
          hover:not-disabled:border-edge-hover hover:not-disabled:bg-accent-wash
          hover:not-disabled:text-accent-text
        `,
        ghost: `
          border-transparent bg-transparent text-ink-dim
          hover:not-disabled:bg-accent-wash hover:not-disabled:text-accent-text
        `,
        danger: `
          border-transparent bg-danger text-danger-on
          hover:not-disabled:bg-danger-hover
        `,
        warnish: `
          border-danger-rule bg-transparent text-danger-text
          hover:not-disabled:bg-danger-wash
        `,
      },
      size: {
        sm: `
          min-h-8 gap-1.5 px-2.5 text-xs
          [&_svg]:size-3.5
        `,
        md: `
          min-h-10 gap-2 px-3.5 text-base
          [&_svg]:size-4
        `,
        lg: `
          min-h-11 gap-2 px-4 text-base
          [&_svg]:size-4
        `,
      },
      shape: {
        text: 'inline-flex items-center justify-center',
        icon: 'inline-grid place-items-center',
      },
    },
    compoundVariants: [
      {
        class: `
          size-8 px-0
          [&_svg]:size-4
        `,
        shape: 'icon',
        size: 'sm',
      },
      {
        class: `
          size-10 px-0
          [&_svg]:size-4.5
        `,
        shape: 'icon',
        size: 'md',
      },
      {
        class: `
          size-11 px-0
          [&_svg]:size-5
        `,
        shape: 'icon',
        size: 'lg',
      },
    ],
    defaultVariants: { shape: 'text', size: 'md', tone: 'quiet' },
  },
);

type ButtonVariantProps = VariantProps<typeof buttonVariants>;

/** 给其它元素复用 button 皮肤 */
export const buttonClass = ({
  className,
  size = 'md',
  tone = 'quiet',
}: {
  className?: string;
  size?: ButtonVariantProps['size'];
  tone?: ButtonVariantProps['tone'];
} = {}) => cn(buttonVariants({ size, tone }), className);

interface ButtonProps
  extends
    Omit<ComponentProps<typeof AriaButton>, 'className' | 'children'>,
    ButtonVariantProps {
  children?: ReactNode;
  className?: string;
  icon?: ReactNode;
  isLoading?: boolean;
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
    className={cn(buttonVariants({ shape: 'text', size, tone }), className)}
    isDisabled={isDisabled === true || isLoading}
    {...rest}
  >
    {isLoading ? <Loader2 aria-hidden className="animate-spin" /> : icon}
    {children}
  </AriaButton>
);

interface IconButtonProps
  extends
    Omit<ComponentProps<typeof AriaButton>, 'className' | 'children'>,
    ButtonVariantProps {
  label: string;
  children: ReactNode;
  className?: string;
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
    className={cn(buttonVariants({ shape: 'icon', size, tone }), className)}
    {...rest}
  >
    {children}
  </AriaButton>
);
