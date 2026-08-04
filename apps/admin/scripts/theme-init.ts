/**
 * 首帧主题初始化脚本（Grey Flowers Admin）。
 *
 * 逻辑与 next-themes 官方脚本同源（参考自 next-themes@0.4.6 的
 * src/script.ts；npm 发布包 files:["dist"] 不含 src，无法直接引用，
 * 只能按契约在此保留一份）。升级 next-themes 时请对照上游 diff 同步。
 * 组件侧（src/app/providers.tsx 的 <ThemeProvider>）断言的是同一个
 * 契约，两边的参数必须保持一致。
 *
 * 本文件不参与 React 依赖图，由 vite/theme-script-plugin.ts 在 dev / build 时用
 * esbuild 剥掉类型后内联进 index.html 的 <head> —— 让深色用户在 JS bundle 执行
 * 之前就拿到正确的主题，不会先吃一帧白闪。
 */

(function (
  attribute: string | string[],
  storageKey: string,
  defaultTheme: string,
  forcedTheme: string | null,
  themes: string[],
  value: Record<string, string> | null,
  enableSystem: boolean,
  enableColorScheme: boolean,
) {
  const el = document.documentElement;
  const systemThemes = ['light', 'dark'];

  function setColorScheme(theme: string) {
    if (enableColorScheme && systemThemes.includes(theme)) {
      el.style.colorScheme = theme;
    }
  }

  function updateDOM(theme: string) {
    const attributes = Array.isArray(attribute) ? attribute : [attribute];

    attributes.forEach((attr) => {
      const isClass = attr === 'class';
      if (isClass) {
        const classes =
          value != null ? themes.map((t) => value[t] || t) : themes;
        el.classList.remove(...classes);
        el.classList.add(value != null && value[theme] ? value[theme] : theme);
      } else {
        el.setAttribute(attr, theme);
      }
    });

    setColorScheme(theme);
  }

  function getSystemTheme(): 'light' | 'dark' {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  if (forcedTheme) {
    updateDOM(forcedTheme);
    return;
  }

  try {
    const themeName = localStorage.getItem(storageKey) || defaultTheme;
    const isSystem = enableSystem && themeName === 'system';
    updateDOM(isSystem ? getSystemTheme() : themeName);
  } catch {
    // localStorage 不可用（隐私模式等）时保持 :root 默认，不阻断首帧。
  }
})('data-theme', 'gf-admin-theme', 'system', null, ['light', 'dark'], null, true, true);
