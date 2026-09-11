/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** 调试：所有接口统一延迟（ms） */
  readonly VITE_API_DELAY_MS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
