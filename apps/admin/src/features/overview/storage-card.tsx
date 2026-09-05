import type { OverviewStorage } from '@grey-flowers/contracts';

import { cn } from 'cn';

import type { ShareSegment } from '@/ui/charts/share-bar';

import { formatBytes } from '@/lib/format';
import { ShareBar } from '@/ui/charts/share-bar';
import { Skeleton } from '@/ui/feedback';
import { Panel, SectionLabel } from '@/ui/surface';

export const StorageCard = ({
  className,
  storage,
}: {
  className?: string;
  storage: OverviewStorage;
}) => {
  const segments: ShareSegment[] = [
    { label: '图片', tone: 'strong', value: storage.imageBytes },
    { label: '音频', tone: 'mid', value: storage.audioBytes },
    { label: '待清理', tone: 'faint', value: storage.pendingBytes },
  ];

  return (
    <Panel
      className={cn(
        `
          flex flex-col gap-3.5 p-4
          md:p-5
        `,
        className,
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <SectionLabel>存储构成</SectionLabel>
        <span className="font-mono text-2xs text-ink-dim">
          共 {formatBytes(storage.totalBytes)}
        </span>
      </div>

      {storage.totalBytes === 0 ? (
        <p className="font-mono text-2xs text-ink-dim">还没有资产。</p>
      ) : (
        <ShareBar
          ariaLabel={`资产体积构成，共 ${formatBytes(storage.totalBytes)}`}
          format={formatBytes}
          segments={segments}
        />
      )}
    </Panel>
  );
};

export const StorageCardSkeleton = ({ className }: { className?: string }) => (
  <Panel
    aria-hidden
    className={cn(
      `
        flex animate-content-in flex-col gap-3.5 p-4
        md:p-5
      `,
      className,
    )}
  >
    <div className="flex items-baseline justify-between gap-3">
      <Skeleton className="h-[1.45em] w-24 text-xs" />
      <Skeleton className="h-[1.45em] w-20 text-2xs" />
    </div>

    <div className="grid gap-3">
      <Skeleton className="h-2.5 w-full rounded-none" />
      <ul className="grid gap-1.5">
        {Array.from({ length: 3 }, (_, index) => (
          <li className="flex items-baseline gap-2" key={index}>
            <div className="size-2 shrink-0 animate-pulse bg-rule" />
            <Skeleton className="h-[1.55em] min-w-0 flex-1 text-base" />
            <Skeleton className="h-[1.55em] w-16 text-base" />
            <Skeleton className="h-[1.45em] w-10 text-2xs" />
          </li>
        ))}
      </ul>
    </div>
  </Panel>
);
