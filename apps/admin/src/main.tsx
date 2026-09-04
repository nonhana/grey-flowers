import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app/app.js';
import { bootstrapAdminApp } from './app/bootstrap.js';

import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-500.css';

import './styles/index.css';

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
