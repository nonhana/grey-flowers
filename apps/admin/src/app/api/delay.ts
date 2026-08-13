/**
 * 调试：统一接口延迟（ms）。
 *
 * 生效优先级：URL 查询参数 `?apiDelay=` > localStorage > VITE_API_DELAY_MS > 0。
 * 每次请求前读取，改完立即生效、无需重启 —— 用于肉眼验收骨架屏/加载态。
 * URL 参数刷新后保留，适合临时或自动化场景；localStorage 由侧栏调试控件写入。
 */
export const API_DELAY_STORAGE_KEY = 'gf.admin.apiDelayMs';

const parseDelay = (value: string | undefined | null): number => {
  if (value === undefined || value === null) return Number.NaN;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : Number.NaN;
};

export const readApiDelayMs = (): number => {
  // 调试能力只属于开发态：生产构建此分支被压缩器消除，延迟恒为 0。
  if (import.meta.env.PROD) return 0;

  const urlDelay = parseDelay(
    new URLSearchParams(window.location.search).get('apiDelay'),
  );
  if (Number.isFinite(urlDelay)) return urlDelay;

  const storedDelay = parseDelay(localStorage.getItem(API_DELAY_STORAGE_KEY));
  if (Number.isFinite(storedDelay)) return storedDelay;

  const envDelay = parseDelay(import.meta.env.VITE_API_DELAY_MS);
  return Number.isFinite(envDelay) ? envDelay : 0;
};

export const writeApiDelayMs = (delayMs: number) => {
  localStorage.setItem(API_DELAY_STORAGE_KEY, String(delayMs));
};
