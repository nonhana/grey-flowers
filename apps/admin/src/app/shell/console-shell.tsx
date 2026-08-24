import { Link, Outlet, useMatches } from '@tanstack/react-router';
import { cn } from 'cnfast';
import {
  FileText,
  LayoutDashboard,
  MoreHorizontal,
  PenLine,
} from 'lucide-react';
import { useState, type ComponentType } from 'react';

import { MusicPlayer } from '@/features/music/player/music-player.js';

import type { ComposeMenuProps } from './compose-menu.js';
import type { MoreSheetProps } from './more-sheet.js';

import { ComposeFab } from './compose-fab.js';
import { ConsoleRail } from './console-rail.js';

const tabClass = cn(
  'flex h-14 flex-1 flex-col items-center justify-center gap-1 rounded-control',
  'font-mono text-2xs text-ink-dim transition-colors duration-150',
  '[&_svg]:size-5',
  'data-[status=active]:text-accent-text',
);

const MobileTabBar = ({ onMore }: { onMore: () => void }) => (
  <nav
    aria-label="主导航"
    className={cn(
      'flex items-center gap-1 border-t border-rule bg-case px-2 pt-1',
      `
        pb-[max(0.25rem,env(safe-area-inset-bottom))]
        md:hidden
      `,
    )}
  >
    <Link className={tabClass} to="/">
      <LayoutDashboard aria-hidden />
      总览
    </Link>
    <Link className={tabClass} to="/articles">
      <FileText aria-hidden />
      文章
    </Link>
    <Link className={tabClass} to="/activities">
      <PenLine aria-hidden />
      动态
    </Link>
    <button className={tabClass} onClick={onMore} type="button">
      <MoreHorizontal aria-hidden />
      更多
    </button>
  </nav>
);
/** 控制台外壳：html/body/#root 全 100%，外壳 flex-row 让侧栏拉伸到底。 */
export const ConsoleShell = () => {
  const [composeOpen, setComposeOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  // MoreSheet 首次打开时才懒加载；加载后保持挂载，关闭动画完整走完（交接 P2）。
  const [MoreSheet, setMoreSheet] =
    useState<ComponentType<MoreSheetProps> | null>(null);
  const openMore = () => {
    setMoreOpen(true);
    if (!MoreSheet) {
      void import('./more-sheet.js').then((mod) =>
        setMoreSheet(() => mod.MoreSheet),
      );
    }
  };
  // ComposeMenu（motion 展开层）由 ComposeFab 悬停/聚焦/pointerdown 预取后懒加载；
  // open 状态仍在 shell 持有，首次点击不会丢（交接 P2）。
  const [ComposeMenu, setComposeMenu] =
    useState<ComponentType<ComposeMenuProps> | null>(null);
  const prefetchComposeMenu = () => {
    if (!ComposeMenu) {
      void import('./compose-menu.js').then((mod) =>
        setComposeMenu(() => mod.ComposeMenu),
      );
    }
  };
  const matches = useMatches();
  const isFullBleed = matches.some(
    (match) => (match.staticData as { fullBleed?: boolean }).fullBleed === true,
  );

  return (
    <div
      className="
        flex h-full min-h-0 flex-col overflow-hidden
        md:flex-row
      "
    >
      <ConsoleRail />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <main className="min-h-0 flex-1 overflow-hidden">
          <Outlet />
        </main>
        {isFullBleed ? null : (
          <>
            <MusicPlayer composeMenuOpen={composeOpen} />
            <ComposeFab
              onPrefetch={prefetchComposeMenu}
              onToggle={() => setComposeOpen((open) => !open)}
              open={composeOpen}
            />
            {ComposeMenu ? (
              <ComposeMenu onOpenChange={setComposeOpen} open={composeOpen} />
            ) : null}
            <MobileTabBar onMore={openMore} />
          </>
        )}
      </div>
      {MoreSheet ? (
        <MoreSheet isOpen={moreOpen} onOpenChange={setMoreOpen} />
      ) : null}
    </div>
  );
};
