import { cn } from 'cn';
import { Plus } from 'lucide-react';

export const ComposeFab = ({
  onToggle,
  open,
}: {
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
