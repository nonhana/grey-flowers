import type { OverviewStorage } from '@grey-flowers/contracts';

import { cn } from 'cnfast';

import type { ShareSegment } from '@/ui/index.js';

import { formatBytes } from '@/lib/format.js';
import { Panel, SectionLabel, ShareBar, Skeleton } from '@/ui/index.js';

/**
 * 存储构成。读数抽屉已经给了资产的**数量**（图片 1191 · 音频 280），
 * 这里给的是**体积** —— 「该不该清」只有体积答得了：
 * 11 个待清理资产占 40% 空间是信号，占 0.1% 就不是。
 *
 * 三段互斥且和为总量，所以能画成 part-to-whole。三档明度在 10px 高的横条上
 * 完全分得开，这是这套单一色板里唯一站得住的占比图。
 */
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

/**
 * 与真实存储卡同构的骨架：卡头 + 量值条 h-2.5 + 三行图例。
 * 图例行高与真实一致（text-base lh 1.55 主导），落地时卡高不跳。
 */
export const StorageCardSkeleton = ({ className }: { className?: string }) => (
  <Panel
    aria-hidden="true"
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
