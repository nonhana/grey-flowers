import type { ComponentProps, ReactNode } from 'react';

import { cn } from 'cnfast';

type PageWidth = 'narrow' | 'default' | 'wide';
type PageBodyScroll = 'body' | 'child';

const WIDTH: Record<PageWidth, string> = {
  narrow: 'max-w-2xl',
  default: 'max-w-4xl',
  wide: 'max-w-6xl',
};

/**
 * 页面容器。默认在内容区内滚动；列表页将滚动所有权移交给子级 items 区域。
 * 底部在移动端预留拇指动作栏与安全区，否则最后一行内容会被永久压在栏下面。
 */
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
  <div
    className={cn(
      `
        mx-auto flex size-full min-h-0 flex-col px-4
        pb-[calc(6rem+env(safe-area-inset-bottom))]
      `,
      'pt-[max(1.5rem,calc(env(safe-area-inset-top)+0.5rem))]',
      `
        sm:px-6
        md:py-10
        lg:px-8
      `,
      scroll === 'body'
        ? 'overflow-y-auto overscroll-contain'
        : 'overflow-hidden',
      WIDTH[width],
      className,
    )}
  >
    {children}
  </div>
);

/**
 * 页头。标题之上不放 kicker / eyebrow —— 标题自己扛得住。
 */
export const PageHeader = ({
  actions,
  description,
  leading,
  title,
}: {
  actions?: ReactNode;
  description?: string;
  /** 返回箭头这类前置控件。 */
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
        {/* 标题必须是这一屏最大的东西 —— 否则一个 264px 的蓝按钮就会
            把页面的主语抢走。 */}
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

/** 分组容器。描边即抬升，不再叠投影。 */
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

/**
 * 字盘：靠发丝分隔线切格，而不是靠一堆同尺寸卡片堆叠。
 */
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

/** 元数据行：拉丁与数字走等宽并对齐，中文回退到 Noto Sans SC。 */
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
