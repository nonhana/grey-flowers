import { Link, Outlet, useMatches } from '@tanstack/react-router';
import { cn } from 'cn';
import {
  FileText,
  LayoutDashboard,
  MoreHorizontal,
  PenLine,
} from 'lucide-react';
import { useState } from 'react';

import { MusicPlayer } from '@/features/music/player/music-player';

import { ComposeFab } from './compose-fab';
import { ComposeMenu } from './compose-menu';
import { ConsoleRail } from './console-rail';
import { MoreSheet } from './more-sheet';

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

// 控制台外壳
export const ConsoleShell = () => {
  const [composeOpen, setComposeOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const matches = useMatches();
  const isFullBleed = matches.some((match) => match.staticData.fullBleed);

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
              onToggle={() => setComposeOpen((open) => !open)}
              open={composeOpen}
            />
            <ComposeMenu onOpenChange={setComposeOpen} open={composeOpen} />
            <MobileTabBar onMore={() => setMoreOpen(true)} />
          </>
        )}
      </div>
      <MoreSheet isOpen={moreOpen} onOpenChange={setMoreOpen} />
    </div>
  );
};
