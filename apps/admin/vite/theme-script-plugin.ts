import { readFile } from 'node:fs/promises';

import { transformWithEsbuild } from 'vite';
import type { Plugin } from 'vite';

const SCRIPT_PATH = new URL('../scripts/theme-init.ts', import.meta.url);

/**
 * 把 scripts/theme-init.ts 编译成内联 <script> 注入 <head>。
 *
 * 首帧主题脚本必须早于 JS bundle 执行（否则深色用户会先吃一帧白闪），而
 * next-themes 的 ThemeScript 是 React 渲染出的 <script>，在 Vite SPA 里来不及。
 * 所以这里在 dev / build 时用 esbuild 剥掉类型，把它作为内联脚本放到 head。
 */
export function themeInitScript(): Plugin {
  return {
    name: 'grey-flowers:theme-init-script',
    async transformIndexHtml() {
      const source = await readFile(SCRIPT_PATH, 'utf8');
      const { code } = await transformWithEsbuild(source, 'theme-init.ts', {
        loader: 'ts',
        format: 'iife',
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
