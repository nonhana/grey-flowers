import type { LucideIcon } from 'lucide-react';

import { Link, Outlet, useMatches } from '@tanstack/react-router';
import { cn } from 'cnfast';
import {
  FileText,
  Flower2,
  FolderTree,
  Images,
  LogOut,
  MessagesSquare,
  MoreHorizontal,
  Music2,
  PenLine,
  Send,
  SquarePen,
  Tags,
} from 'lucide-react';
import { useState } from 'react';

import { ComposeMenu } from '@/app/shell/compose-menu.js';
import { ThemeToggle } from '@/app/theme/theme-toggle.js';
import { MusicPlayer } from '@/features/music/player/music-player.js';
import { useAuth } from '@/store/auth.js';
import { BottomSheet, buttonClass, Hint, IconButton } from '@/ui/index.js';

interface NavItem {
  icon: LucideIcon;
  label: string;
  path: string;
}

interface NavSection {
  items: NavItem[];
  title: string;
}

const ARTICLE_FILTERS = [
  { label: '全部', search: {} },
  { label: '草稿', search: { status: 'draft' } },
  { label: '已发布', search: { status: 'published' } },
] as const;

const SECTIONS: NavSection[] = [
  {
    title: '内容',
    items: [
      { icon: FileText, label: '文章', path: '/articles' },
      { icon: Send, label: '动态', path: '/activities' },
    ],
  },
  {
    title: '组织',
    items: [
      { icon: FolderTree, label: '分类', path: '/categories' },
      { icon: Tags, label: '标签', path: '/tags' },
    ],
  },
  {
    title: '素材',
    items: [
      { icon: Images, label: '资产库', path: '/assets' },
      { icon: Music2, label: '音乐库', path: '/music' },
    ],
  },
  {
    title: '互动',
    items: [{ icon: MessagesSquare, label: '评论', path: '/comments' }],
  },
];

const navRowClass = cn(
  'flex min-h-10 items-center gap-2.5 rounded-control px-2.5',
  'text-base text-ink-dim transition-colors duration-150',
  'hover:bg-accent-wash hover:text-accent-text',
  '[&_svg]:size-4 [&_svg]:shrink-0',
  'data-[status=active]:bg-accent-wash data-[status=active]:font-bold',
  'data-[status=active]:text-accent-text',
);

/*
 * 选中态一律走 TanStack 挂在链接上的 data-status，而不是 activeProps 追加 class：
 * 追加的 text-accent-text 与基类的 text-ink-dim 特异性相同，谁生效取决于
 * Tailwind 输出的先后顺序 —— 实测输给了 ink-dim，于是子项完全没有选中态。
 * data-[status=active]: 编译成属性选择器，特异性更高，结果是确定的。
 */
const subRowClass = cn(
  'flex min-h-8 items-center rounded-control py-1 pr-2.5 pl-9',
  'font-mono text-base text-ink-dim transition-colors duration-150',
  'hover:text-accent-text',
  'data-[status=active]:font-medium data-[status=active]:text-accent-text',
);

const BrandMark = () => (
  <span className="flex items-center gap-2 font-mono text-base text-accent-text">
    <Flower2 aria-hidden="true" className="size-5 shrink-0" />
    <span className="truncate">Grey Flowers</span>
    <span className="text-2xs text-ink-dim">Admin</span>
  </span>
);

const ArticleFilterLinks = () => (
  <div className="grid">
    {ARTICLE_FILTERS.map((filter) => (
      <Link
        activeOptions={{ exact: true, includeSearch: true }}
        className={subRowClass}
        key={filter.label}
        search={filter.search}
        to="/articles"
      >
        {filter.label}
      </Link>
    ))}
  </div>
);

const NavSections = () => (
  <>
    {SECTIONS.map((section) => (
      <div className="grid gap-0.5" key={section.title}>
        <p className="px-2.5 pt-3 pb-1 font-mono text-2xs text-ink-dim">
          {section.title}
        </p>
        {section.items.map((item) => (
          <div className="grid" key={item.path}>
            <Link
              activeOptions={{ exact: false, includeSearch: false }}
              className={navRowClass}
              to={item.path}
            >
              <item.icon aria-hidden="true" />
              {item.label}
            </Link>
            {item.path === '/articles' ? <ArticleFilterLinks /> : null}
          </div>
        ))}
      </div>
    ))}
  </>
);

const AccountBlock = ({ layout }: { layout: 'rail' | 'sheet' }) => {
  const { isSigningOut, signOut, state } = useAuth();
  const username =
    state.status === 'authenticated' ? state.principal.username : '';

  return (
    <div
      className={cn(
        'flex items-center gap-2',
        layout === 'sheet' && 'justify-between',
      )}
    >
      <span className="min-w-0 flex-1 truncate font-mono text-xs text-ink-dim">
        {username}
      </span>
      <ThemeToggle />
      <Hint label="退出登录" placement="top">
        <IconButton
          isDisabled={isSigningOut}
          label={isSigningOut ? '正在退出登录' : '退出登录'}
          onPress={() => void signOut()}
          size="sm"
        >
          <LogOut aria-hidden="true" />
        </IconButton>
      </Hint>
    </div>
  );
};

const ConsoleRail = () => (
  <aside
    aria-label="主导航"
    className="
      hidden w-66 shrink-0 flex-col border-r border-rule bg-case
      md:flex
    "
  >
    <div className="px-4 pt-5 pb-4">
      <BrandMark />
    </div>
    <div className="px-3">
      {/* 视觉上必须与导航行彻底不同：这是动作，不是位置。 */}
      <Link
        className={buttonClass({ className: 'w-full', tone: 'solid' })}
        to="/articles/new"
      >
        <SquarePen aria-hidden="true" className="size-4" />
        新建文章
      </Link>
    </div>
    <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
      <NavSections />
    </nav>
    <div className="border-t border-rule p-3">
      <AccountBlock layout="rail" />
    </div>
  </aside>
);

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
        flex h-full min-h-0 flex-col
        md:flex-row
      "
    >
      <ConsoleRail />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <main
          className={cn(
            'min-h-0 flex-1',
            isFullBleed
              ? 'overflow-hidden'
              : `
                overflow-y-auto pb-[calc(6rem+env(safe-area-inset-bottom))]
                md:pb-0
              `,
          )}
        >
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
