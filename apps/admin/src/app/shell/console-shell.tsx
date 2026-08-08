import { Link, Outlet, useMatches } from '@tanstack/react-router';
import { cn } from 'cnfast';
import {
  FileText,
  FolderTree,
  Images,
  LayoutDashboard,
  MessagesSquare,
  MoreHorizontal,
  Music2,
  PenLine,
  Tags,
  Users,
} from 'lucide-react';
import { useState } from 'react';

import { ComposeMenu } from '@/app/shell/compose-menu.js';
import { MusicPlayer } from '@/features/music/player/music-player.js';
import { BottomSheet } from '@/ui/index.js';

import { AccountBlock, ConsoleRail, navRowClass } from './console-rail.js';

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
    <Link
      activeOptions={{ exact: false, includeSearch: false }}
      className={tabClass}
      to="/articles"
    >
      <FileText aria-hidden="true" />
      文章
    </Link>
    <Link className={tabClass} to="/activities">
      <PenLine aria-hidden="true" />
      动态
    </Link>
    <Link className={tabClass} to="/assets">
      <Images aria-hidden="true" />
      资产
    </Link>
    <button className={tabClass} onClick={onMore} type="button">
      <MoreHorizontal aria-hidden="true" />
      更多
    </button>
  </nav>
);
const MoreSheet = ({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) => (
  <BottomSheet isOpen={isOpen} onOpenChange={onOpenChange} title="更多">
    <div className="grid gap-1 px-4 pt-1 pb-4">
      <Link className={navRowClass} onClick={() => onOpenChange(false)} to="/">
        <LayoutDashboard aria-hidden="true" />
        总览
      </Link>
      <Link
        className={navRowClass}
        onClick={() => onOpenChange(false)}
        to="/music"
      >
        <Music2 aria-hidden="true" />
        音乐库
      </Link>
      <Link
        className={navRowClass}
        onClick={() => onOpenChange(false)}
        to="/categories"
      >
        <FolderTree aria-hidden="true" />
        分类
      </Link>
      <Link
        className={navRowClass}
        onClick={() => onOpenChange(false)}
        to="/comments"
      >
        <MessagesSquare aria-hidden="true" />
        评论
      </Link>
      <Link
        className={navRowClass}
        onClick={() => onOpenChange(false)}
        to="/users"
      >
        <Users aria-hidden="true" />
        用户
      </Link>
      <Link
        className={navRowClass}
        onClick={() => onOpenChange(false)}
        to="/tags"
      >
        <Tags aria-hidden="true" />
        标签
      </Link>
      <div className="mt-3 border-t border-rule pt-3">
        <AccountBlock layout="sheet" />
      </div>
    </div>
  </BottomSheet>
);

/**
 * 控制台外壳。
 *
 * 高度链在这里被真正接上：html / body / #root 都是 100%，
 * 外壳用 flex-row，侧栏作为 flex 子项自动拉伸到底 —— 这是旧实现里
 * 侧栏只有内容高、底下露出网格的根因。
 */
export const ConsoleShell = () => {
  const [moreOpen, setMoreOpen] = useState(false);
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
            <MusicPlayer />
            <ComposeMenu />
            <MobileTabBar onMore={() => setMoreOpen(true)} />
          </>
        )}
      </div>
      <MoreSheet isOpen={moreOpen} onOpenChange={setMoreOpen} />
    </div>
  );
};
