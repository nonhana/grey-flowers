import type { LucideIcon } from 'lucide-react';
import type { ComponentProps } from 'react';

import { Link } from '@tanstack/react-router';
import { cn } from 'cnfast';
import { PenLine, SquarePen } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useEffect } from 'react';

const MENU_ITEMS = [
  { icon: PenLine, label: '发布动态', to: '/activities/new' },
  { icon: SquarePen, label: '发布文章', to: '/articles/new' },
] as const satisfies ReadonlyArray<{
  icon: LucideIcon;
  label: string;
  to: ComponentProps<typeof Link>['to'];
}>;

// 子按钮从主按钮往上叠：FAB(56) + 间距(12) + 子按钮(48)。
const CHILD_GAP = 12;
const CHILD_SIZE = 48;
const nearestBottom = 56 + CHILD_GAP;
const stackStep = CHILD_SIZE + CHILD_GAP;

/**
 * 移动端发布展开弹层（motion 懒加载部分）：遮罩 + 两个纯图标圆形弹簧弹出。
 * 用「常驻 DOM + animate」而非 AnimatePresence（React Compiler 下挂载动画被跳过，
 * 实测卡 initial）；展开态由 ConsoleShell 持有，供音乐按钮让位共享。
 */
export interface ComposeMenuProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

export const ComposeMenu = ({ onOpenChange, open }: ComposeMenuProps) => {
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onOpenChange, open]);

  const spring = prefersReducedMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 460, damping: 32, mass: 0.65 };

  return (
    <>
      {/* 点外面即收起：常驻透明层，只用透明度切换可见性。 */}
      <motion.button
        aria-label="收起发布菜单"
        className={cn(
          'fixed inset-0 z-40',
          'md:hidden',
          open ? '' : 'pointer-events-none',
        )}
        animate={{ opacity: open ? 1 : 0 }}
        initial={false}
        onClick={() => onOpenChange(false)}
        tabIndex={open ? 0 : -1}
        transition={spring}
        type="button"
      />

      <div
        aria-hidden={!open}
        className={cn(
          'fixed z-50 w-12',
          'pointer-events-none',
          'md:hidden',
          'right-[max(1rem,env(safe-area-inset-right))]',
          'bottom-[calc(5rem+env(safe-area-inset-bottom))]',
        )}
      >
        {MENU_ITEMS.map((item, index) => (
          <motion.span
            animate={
              open
                ? { opacity: 1, scale: 1, y: 0 }
                : { opacity: 0, scale: 0.5, y: 14 }
            }
            className={cn(
              'absolute inset-x-0 grid size-12 place-items-center',
              open ? 'pointer-events-auto' : 'pointer-events-none',
            )}
            initial={false}
            key={item.label}
            style={{
              bottom:
                nearestBottom + (MENU_ITEMS.length - 1 - index) * stackStep,
            }}
            transition={{
              ...spring,
              delay: open
                ? index * 0.045
                : (MENU_ITEMS.length - 1 - index) * 0.03,
            }}
          >
            <Link
              aria-label={item.label}
              className="
                grid size-12 place-items-center rounded-full border border-rule
                bg-case-raised text-ink-strong shadow-float transition-colors
                duration-150
                hover:bg-accent-wash hover:text-accent-text
              "
              onClick={() => onOpenChange(false)}
              tabIndex={open ? 0 : -1}
              to={item.to}
            >
              <item.icon aria-hidden className="size-5" />
            </Link>
          </motion.span>
        ))}
      </div>
    </>
  );
};
