import type { ReactNode } from 'react';

import { Skeleton } from '@/ui/feedback';
import { SectionLabel } from '@/ui/surface';

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
    {secondary && (
      <p className="line-clamp-2 font-mono text-2xs/snug text-ink-dim">
        {secondary}
      </p>
    )}
  </div>
);

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
