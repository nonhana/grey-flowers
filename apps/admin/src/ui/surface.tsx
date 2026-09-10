import type { ComponentProps, ReactNode } from 'react';

import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from 'cn';

const pageBodyVariants = cva(
  `
    mx-auto flex size-full min-h-0 flex-col px-4
    pt-[max(1.5rem,calc(env(safe-area-inset-top)+0.5rem))]
    sm:px-6
    md:py-10
    lg:px-8
  `,
  {
    variants: {
      scroll: {
        body: `
          overflow-y-auto overscroll-contain
          pb-[calc(6rem+env(safe-area-inset-bottom))]
        `,
        child: 'overflow-hidden pb-[calc(1rem+env(safe-area-inset-bottom))]',
      },
      width: { narrow: 'max-w-2xl', default: 'max-w-4xl', wide: 'max-w-6xl' },
    },
  },
);

type PageWidth = NonNullable<VariantProps<typeof pageBodyVariants>['width']>;
type PageBodyScroll = NonNullable<
  VariantProps<typeof pageBodyVariants>['scroll']
>;

/** 页面容器，可以控制发生滚动的容器位于哪一层 */
export const PageBody = ({
  children,
  className,
  scroll = 'body',
  width = 'default',
}: {
  children: ReactNode;
  className?: string;
  scroll?: PageBodyScroll;
  width?: PageWidth;
}) => (
  <div className={cn(pageBodyVariants({ scroll, width }), className)}>
    {children}
  </div>
);

export const PageHeader = ({
  actions,
  description,
  leading,
  title,
}: {
  actions?: ReactNode;
  description?: string;
  leading?: ReactNode;
  title: string;
}) => (
  <header
    className="
      flex w-full flex-wrap items-start justify-between gap-x-4 gap-y-3
    "
  >
    <div className="flex min-w-0 items-start gap-2">
      {leading ? <div className="-ml-2 shrink-0 pt-0.5">{leading}</div> : null}
      <div className="grid min-w-0 gap-1">
        <h1 className="truncate text-2xl font-bold text-ink-strong">{title}</h1>
        {description ? (
          <p className="max-w-prose text-base text-ink-dim">{description}</p>
        ) : null}
      </div>
    </div>
    {actions ? (
      <div className="flex w-full shrink-0 items-center gap-2">{actions}</div>
    ) : null}
  </header>
);

export const Panel = ({
  children,
  className,
  ...rest
}: ComponentProps<'section'>) => (
  <section
    className={cn('rounded-panel border border-rule bg-case-raised', className)}
    {...rest}
  >
    {children}
  </section>
);

export const RowStack = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      'overflow-hidden rounded-panel border border-rule bg-case-raised',
      '[&>*+*]:border-t [&>*+*]:border-rule',
      className,
    )}
  >
    {children}
  </div>
);

export const SectionLabel = ({
  children,
  className,
  ...rest
}: ComponentProps<'h3'>) => (
  <h3 className={cn('font-mono text-xs text-ink-dim', className)} {...rest}>
    {children}
  </h3>
);

export const MetaLine = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      `
        flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-2xs
        text-ink-dim
      `,
      className,
    )}
  >
    {children}
  </div>
);
