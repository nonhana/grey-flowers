(() => {
  try {
    const el = document.documentElement;
    const stored = localStorage.getItem('gf-admin-theme') || 'system';
    const theme =
      stored === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : stored;

    el.setAttribute('data-theme', theme);
    if (theme === 'light' || theme === 'dark') {
      el.style.colorScheme = theme;
    }
  } catch {
    // localStorage 不可用（隐私模式等）时保持 :root 默认
  }
})();
