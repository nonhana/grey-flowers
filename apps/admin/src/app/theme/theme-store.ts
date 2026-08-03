import { useSyncExternalStore } from 'react';

export type ThemeMode = 'system' | 'light' | 'dark';

/** 与 index.html 首帧引导脚本共用，改这里必须同步改那里。 */
const STORAGE_KEY = 'gf-admin-theme';

const readStoredMode = (): ThemeMode => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
};

const darkMedia = () => window.matchMedia('(prefers-color-scheme: dark)');

const paint = (mode: ThemeMode) => {
  const isDark = mode === 'dark' || (mode === 'system' && darkMedia().matches);
  const root = document.documentElement;
  root.dataset.theme = isDark ? 'dark' : 'light';
  root.style.colorScheme = isDark ? 'dark' : 'light';
};

let mode = readStoredMode();
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const setThemeMode = (next: ThemeMode) => {
  mode = next;
  try {
    if (next === 'system') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // 隐私模式下写不进去也不该让切换失败，本次会话内仍然生效。
  }
  paint(next);
  for (const listener of listeners) listener();
};

// 跟随系统时，系统天光变了要跟着变。
darkMedia().addEventListener('change', () => {
  if (mode === 'system') paint('system');
});

const SERVER_MODE: ThemeMode = 'system';

export const useThemeMode = () =>
  useSyncExternalStore(
    subscribe,
    () => mode,
    () => SERVER_MODE,
  );
