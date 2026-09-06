export const API_DELAY_STORAGE_KEY = 'gf.admin.apiDelayMs';

const parseDelay = (value: string | undefined | null): number => {
  if (value === undefined || value === null) return Number.NaN;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : Number.NaN;
};

export const readApiDelayMs = (): number => {
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
