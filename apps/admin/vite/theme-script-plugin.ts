import type { Plugin } from 'vite';

import { readFile } from 'node:fs/promises';
import { transformWithOxc } from 'vite';

const SCRIPT_PATH = new URL('../scripts/theme-init.ts', import.meta.url);

export function themeInitScript(): Plugin {
  return {
    name: 'grey-flowers:theme-init-script',
    async transformIndexHtml() {
      const source = await readFile(SCRIPT_PATH, 'utf8');
      const { code } = await transformWithOxc(source, 'theme-init.ts', {
        lang: 'ts',
        sourceType: 'script',
      });
      return [
        {
          tag: 'script',
          attrs: {},
          children: code,
          injectTo: 'head',
        },
      ];
    },
  };
}
