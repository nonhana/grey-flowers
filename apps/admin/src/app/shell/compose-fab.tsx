import { cn } from 'cnfast';
import { Plus } from 'lucide-react';

/**
 * 移动端统一的发布悬浮按钮（FAB，md:hidden）：单一圆形 +。
 *
 * 入口链常驻版本，不带 motion —— 展开菜单（motion 弹层，含 spring 逐层弹出）
 * 由 ConsoleShell 懒加载。这里在悬停 / 聚焦 / pointerdown 时触发 onPrefetch，
 * 让首次展开不用等网络（交接 P2）。微交互（按下缩放、展开旋转）用 CSS 等价实现。
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
