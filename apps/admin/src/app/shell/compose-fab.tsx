import { cn } from 'cnfast';
import { Plus } from 'lucide-react';

/**
 * 移动端发布 FAB（md:hidden）：常驻入口链不带 motion，展开菜单由 shell 懒加载；
 * 悬停/聚焦/pointerdown 触发 onPrefetch，首次展开不等网络。
 */
export const ComposeFab = ({
  onPrefetch,
  onToggle,
  open,
}: {
  onPrefetch: () => void;
  onToggle: () => void;
  open: boolean;
}) => (
  <button
    aria-expanded={open}
    aria-haspopup="menu"
    aria-label={open ? '收起发布菜单' : '发布新内容'}
    className={cn(
      'fixed z-50 grid size-12 place-items-center rounded-full bg-accent',
      'text-accent-on shadow-float transition-colors duration-150',
      'right-[max(1rem,env(safe-area-inset-right))]',
      'bottom-[calc(4.5rem+env(safe-area-inset-bottom))]',
      'hover:bg-accent-hover',
      'active:scale-[0.92]',
      open && 'bg-accent-hover',
      'md:hidden',
    )}
    onClick={onToggle}
    onFocus={onPrefetch}
    onPointerDown={onPrefetch}
    onPointerEnter={onPrefetch}
    type="button"
  >
    <Plus
      aria-hidden
      className={cn(
        'size-5 transition-transform duration-200 ease-out',
        open && 'rotate-45',
      )}
    />
  </button>
);
