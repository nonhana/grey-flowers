/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 调试：所有接口统一延迟（ms）。localStorage 与 URL ?apiDelay= 可覆盖。 */
  readonly VITE_API_DELAY_MS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
