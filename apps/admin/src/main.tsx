import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app/app.js';
import { bootstrapAdminApp } from './app/bootstrap.js';

// JetBrains Mono 自托管：只取 latin 子集（400/500 合计约 43 KB），
// 断网冷启动时字盘层的拉丁数据也仍然是等宽的，不会掉回系统面。
// CJK 黑体（Noto Sans SC）走 Google 的分片投递 —— 见 index.html 的注释。
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-500.css';

import './styles/index.css';

// 会话过期 handler 与一次性 restore 在 render 之前启动，不依赖 Provider 挂载。
bootstrapAdminApp();

const container = document.querySelector('#root');

if (!container) {
  throw new Error('Admin root container is missing.');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
