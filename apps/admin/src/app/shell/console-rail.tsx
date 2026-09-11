import type { LucideIcon } from 'lucide-react';

import { Link } from '@tanstack/react-router';
import { cn } from 'cn';
import {
  FileText,
  Flower2,
  FolderTree,
  Images,
  LayoutDashboard,
  LogOut,
  MessagesSquare,
  Music2,
  PanelLeftClose,
  PanelLeftOpen,
  Send,
  SquarePen,
  Tags,
  Users,
} from 'lucide-react';
import { useRef, useState } from 'react';

import type { RailSize } from '@/lib/rail-size';

import { ThemeToggle } from '@/app/theme/theme-toggle';
import {
  useResizableEdge,
  type ResizeSource,
} from '@/hooks/use-resizable-edge';
import { RAIL_SIZE, resolveRailSize } from '@/lib/rail-size';
import { useAuth } from '@/store/auth';
import { buttonClass, IconButton } from '@/ui/button';
import { Hint } from '@/ui/hint';

import { ApiDelayControl } from './api-delay-control';

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
  { label: '全部', status: undefined },
  { label: '草稿', status: 'draft' },
  { label: '已发布', status: 'published' },
] as const;

const SECTIONS: NavSection[] = [
  {
    title: '概览',
    items: [{ icon: LayoutDashboard, label: '总览', path: '/' }],
  },
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
    items: [
      { icon: MessagesSquare, label: '评论', path: '/comments' },
      { icon: Users, label: '用户', path: '/users' },
    ],
  },
];

export const navRowClass =
  'relative flex min-h-10 items-center gap-2.5 rounded-control px-2.5 text-base text-ink-dim transition-colors duration-150 hover:bg-accent-wash hover:text-accent-text [&_svg]:size-4 [&_svg]:shrink-0 data-[status=active]:bg-accent-wash data-[status=active]:font-bold data-[status=active]:text-accent-text';

const subRowClass =
  'flex min-h-8 items-center rounded-control py-1 pr-2.5 pl-9 font-mono text-base text-ink-dim transition-colors duration-150 hover:text-accent-text data-[status=active]:font-medium data-[status=active]:text-accent-text';

const STORAGE_KEY = 'gf.admin.rail';

const loadRailSize = (): RailSize => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { collapsed: false, width: RAIL_SIZE.default };
    const parsed = JSON.parse(stored) as Partial<RailSize>;
    const width =
      typeof parsed.width === 'number'
        ? Math.min(Math.max(parsed.width, RAIL_SIZE.min), RAIL_SIZE.max)
        : RAIL_SIZE.default;
    return { collapsed: parsed.collapsed === true, width };
  } catch {
    return { collapsed: false, width: RAIL_SIZE.default };
  }
};

const saveRailSize = (size: RailSize) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(size));
  } catch {
    // 隐私模式等场景写失败不阻塞交互
  }
};

const BrandMark = () => (
  <span className="flex items-center gap-2 font-mono text-base text-accent-text">
    <Flower2 aria-hidden className="size-5 shrink-0" />
    <span className="truncate">Admin</span>
  </span>
);

const ArticleFilterLinks = () => (
  <div className="grid">
    {ARTICLE_FILTERS.map((filter) => (
      <Link
        activeOptions={{ exact: true, includeSearch: true }}
        className={subRowClass}
        key={filter.label}
        search={(prev) => ({ ...prev, status: filter.status, page: undefined })}
        to="/articles"
      >
        {filter.label}
      </Link>
    ))}
  </div>
);

const NavRow = ({ collapsed, item }: { collapsed: boolean; item: NavItem }) => (
  <Link
    activeOptions={{ exact: false, includeSearch: false }}
    aria-label={collapsed ? item.label : undefined}
    className={cn(navRowClass, collapsed && 'justify-center')}
    title={collapsed ? item.label : undefined}
    to={item.path}
  >
    <item.icon aria-hidden className="shrink-0" />
    {/* 折叠态提示用 title（React Aria 的 TooltipTrigger 只向 RAC 组件注入事件，TanStack Link 收不到），配合 aria-label 覆盖 a11y */}
    <span
      className={cn(
        `
          absolute inset-y-0 right-0 left-9 flex min-w-0 items-center
          transition-opacity duration-150
        `,
        collapsed ? 'opacity-0' : 'opacity-100 delay-150',
      )}
    >
      <span className="truncate">{item.label}</span>
    </span>
  </Link>
);

const NavSections = ({ collapsed }: { collapsed: boolean }) => (
  <>
    {SECTIONS.map((section) => (
      <div className="grid gap-0.5" key={section.title}>
        {collapsed ? null : (
          <p className="px-2.5 pt-3 pb-1 font-mono text-2xs text-ink-dim">
            {section.title}
          </p>
        )}
        {section.items.map((item) => (
          <div className="grid" key={item.path}>
            <NavRow collapsed={collapsed} item={item} />
            {item.path === '/articles' && !collapsed ? (
              <ArticleFilterLinks />
            ) : null}
          </div>
        ))}
      </div>
    ))}
  </>
);

export const AccountBlock = ({
  collapsed = false,
  layout,
}: {
  collapsed?: boolean;
  layout: 'rail' | 'sheet';
}) => {
  const { isSigningOut, signOut, state } = useAuth();
  const username =
    state.status === 'authenticated' ? state.principal.username : '';

  return (
    <div
      className={cn(
        'flex items-center gap-2',
        layout === 'sheet' && 'justify-between',
        collapsed && 'flex-col',
      )}
    >
      {collapsed ? null : (
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-ink-dim">
          {username}
        </span>
      )}
      {/* DEV 守卫放在挂载点：生产不执行组件内 hooks，构建可 tree-shake */}
      {layout === 'rail' && !collapsed && import.meta.env.DEV ? (
        <ApiDelayControl />
      ) : null}
      {collapsed ? null : <ThemeToggle />}
      <Hint label="退出登录" placement="top">
        <IconButton
          isDisabled={isSigningOut}
          label={isSigningOut ? '正在退出登录' : '退出登录'}
          onPress={() => void signOut()}
          size="sm"
        >
          <LogOut aria-hidden />
        </IconButton>
      </Hint>
    </div>
  );
};

export const ConsoleRail = () => {
  const [size, setSize] = useState<RailSize>(loadRailSize);
  const railRef = useRef<HTMLElement>(null);
  // 事件路径镜像：拖拽回调闭包来自拖拽开始的那次渲染，镜像让 resolve 恒基于最新尺寸
  const sizeRef = useRef(size);

  const applyResize = (raw: number, source: ResizeSource) => {
    const next = resolveRailSize(sizeRef.current, raw, source);
    sizeRef.current = next;
    setSize(next);
    // 键盘是离散操作，每次都落盘；拖拽只在 onResizeEnd 落盘
    if (source === 'keyboard') saveRailSize(next);
  };

  const { handleProps, isResizing } = useResizableEdge({
    ref: railRef,
    edge: 'right',
    // 钳制范围跟随形态：折叠态允许 [X, MAX] 拖到 Y 展开；展开态钳 [Y, MAX] 拖到 X 才折叠
    min: size.collapsed ? RAIL_SIZE.collapsed : RAIL_SIZE.min,
    max: RAIL_SIZE.max,
    keyboardStep: 16,
    onResize: (_size, change) => applyResize(change.raw, change.source),
    onResizeEnd: (final) => {
      applyResize(final, 'pointer');
      saveRailSize(sizeRef.current);
    },
  });

  const toggle = () => {
    const next: RailSize = { ...size, collapsed: !size.collapsed };
    sizeRef.current = next;
    saveRailSize(next);
    setSize(next);
  };

  const collapsed = size.collapsed;
  const width = collapsed ? RAIL_SIZE.collapsed : size.width;

  return (
    <aside
      aria-label="主导航"
      className={cn(
        `
          relative hidden shrink-0 flex-col border-r border-rule bg-case
          md:flex
        `,
        isResizing
          ? 'transition-none'
          : 'transition-[width] duration-200 ease-out',
      )}
      ref={railRef}
      style={{ width }}
    >
      <div
        className={cn(
          'flex items-center',
          collapsed ? 'justify-center p-2' : 'justify-between px-4 pt-5 pb-4',
        )}
      >
        {collapsed ? null : <BrandMark />}
        <Hint
          label={collapsed ? '展开侧栏' : '折叠侧栏'}
          placement={collapsed ? 'right' : 'bottom'}
        >
          <IconButton
            label={collapsed ? '展开侧栏' : '折叠侧栏'}
            onPress={toggle}
            size="sm"
          >
            {collapsed ? (
              <PanelLeftOpen aria-hidden />
            ) : (
              <PanelLeftClose aria-hidden />
            )}
          </IconButton>
        </Hint>
      </div>
      <div className={cn(collapsed ? 'px-2' : 'px-3')}>
        <Link
          aria-label={collapsed ? '新建文章' : undefined}
          className={cn(buttonClass({ className: 'w-full', tone: 'solid' }))}
          title={collapsed ? '新建文章' : undefined}
          to="/articles/new"
        >
          <SquarePen aria-hidden className="size-4 shrink-0" />
          {collapsed ? null : '新建文章'}
        </Link>
      </div>
      <nav
        className={cn(
          'min-h-0 flex-1 overflow-y-auto pb-4',
          collapsed ? 'px-2' : 'px-3',
        )}
      >
        <NavSections collapsed={collapsed} />
      </nav>
      <div className="border-t border-rule p-3">
        <AccountBlock collapsed={collapsed} layout="rail" />
      </div>
      {/* 把手即 rail 右边本身：命中区中心对准边线，hover/拖拽时向两侧变粗 */}
      <div
        {...handleProps}
        aria-label="调整侧栏宽度"
        aria-valuenow={width}
        className="group absolute inset-y-0 -right-1 z-10 w-2 cursor-col-resize"
      >
        <span
          className={cn(
            `
              absolute inset-y-0 left-1/2 w-px -translate-x-1/2 rounded-full
              transition-all duration-150
            `,
            isResizing
              ? 'w-1.5 bg-accent-rule'
              : `
                bg-transparent
                group-hover:w-1.5 group-hover:bg-accent-rule
              `,
          )}
        />
      </div>
    </aside>
  );
};
