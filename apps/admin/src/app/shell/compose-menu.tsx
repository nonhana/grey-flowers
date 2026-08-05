import type { LucideIcon } from 'lucide-react';
import type { ComponentProps } from 'react';

import { Link } from '@tanstack/react-router';
import { cn } from 'cnfast';
import { PenLine, Plus, SquarePen } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';

const MENU_ITEMS = [
  { icon: PenLine, label: '发布动态', to: '/activities/new' },
  { icon: SquarePen, label: '发布文章', to: '/articles/new' },
] as const satisfies ReadonlyArray<{
  icon: LucideIcon;
  label: string;
  to: ComponentProps<typeof Link>['to'];
}>;

// 子按钮从最靠近主按钮往上叠：FAB(56) + 间距(12) + 子按钮(48)。
const CHILD_GAP = 12;
const CHILD_SIZE = 48;
const nearestBottom = 56 + CHILD_GAP;
const stackStep = CHILD_SIZE + CHILD_GAP;

/**
 * 移动端统一的圆形悬浮发布菜单：单一圆形 +，展开丝滑弹出两个纯图标圆形
 * （发布动态 / 发布文章）。发布是这台机器上最频繁的动作，入口只有一个。
 *
 * 用「常驻 DOM + animate 切换」而不是 AnimatePresence 挂载动画：
 * Admin 开了 React Compiler，motion 的挂载期初始动画会被跳过
 * （实测 A/B：rotate 这类挂载后切换的动画正常，AnimatePresence 新挂载卡在 initial）。
 * 子按钮绝对定位，收起时不占布局，也不会拦截点击。
 */
export const ComposeMenu = () => {
  const [open, setOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

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
        onClick={() => setOpen(false)}
        tabIndex={open ? 0 : -1}
        transition={spring}
        type="button"
      />

      <div
        aria-hidden={!open}
        className={cn(
          'fixed z-50 h-44 w-14',
          'md:hidden',
          'right-[max(1rem,env(safe-area-inset-right))]',
          'bottom-[calc(6rem+env(safe-area-inset-bottom))]',
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
              open ? '' : 'pointer-events-none',
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
              onClick={() => setOpen(false)}
              tabIndex={open ? 0 : -1}
              to={item.to}
            >
              <item.icon aria-hidden="true" className="size-5" />
            </Link>
          </motion.span>
        ))}

        <motion.button
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={open ? '收起发布菜单' : '发布新内容'}
          className={cn(
            'absolute inset-x-0 bottom-0 grid size-12 place-items-center',
            'rounded-full bg-accent text-accent-on',
            'shadow-float transition-colors duration-150',
            'hover:bg-accent-hover',
            open && 'bg-accent-hover',
          )}
          onClick={() => setOpen((current) => !current)}
          whileTap={{ scale: 0.92 }}
          type="button"
        >
          <motion.span
            animate={{ rotate: open ? 45 : 0 }}
            className="grid place-items-center"
            transition={spring}
          >
            <Plus aria-hidden="true" className="size-5" />
          </motion.span>
        </motion.button>
      </div>
    </>
  );
};
