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
})(
  'data-theme',
  'gf-admin-theme',
  'system',
  null,
  ['light', 'dark'],
  null,
  true,
  true,
);
