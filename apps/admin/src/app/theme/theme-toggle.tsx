import { cn } from 'cnfast';
import { Monitor, Moon, Sun } from 'lucide-react';
import { Button } from 'react-aria-components';

import type { ThemeMode } from './theme-store.js';

import { setThemeMode, useThemeMode } from './theme-store.js';

const MODES: Array<{ icon: typeof Sun; label: string; mode: ThemeMode }> = [
  { icon: Monitor, label: '跟随系统', mode: 'system' },
  { icon: Sun, label: '浅色', mode: 'light' },
  { icon: Moon, label: '深色', mode: 'dark' },
];

/** 三态分段控件：当前模式一眼可见，不需要展开菜单才知道自己在哪一档。 */
export const ThemeToggle = ({ className }: { className?: string }) => {
  const current = useThemeMode();

  return (
    <div
      aria-label="主题"
      className={cn(
        'inline-grid grid-cols-3 gap-0.5 rounded-full border border-rule p-0.5',
        className,
      )}
      role="group"
    >
      {MODES.map(({ icon: Icon, label, mode }) => (
        <Button
          aria-label={label}
          aria-pressed={current === mode}
          className={cn(
            `
              grid size-7 place-items-center rounded-full transition-colors
              duration-150
            `,
            '[&_svg]:size-3.5',
            current === mode
              ? 'bg-accent-wash text-accent-text'
              : `
                text-ink-dim
                hover:text-ink
              `,
          )}
          key={mode}
          onPress={() => setThemeMode(mode)}
        >
          <Icon aria-hidden="true" />
        </Button>
      ))}
    </div>
  );
};
