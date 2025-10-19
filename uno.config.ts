import { presetRemToPx } from '@unocss/preset-rem-to-px'
import {
  defineConfig,
  presetIcons,
  presetMini,
  presetTypography,
  presetWebFonts,
  presetWind3,
  transformerDirectives,
  transformerVariantGroup,
} from 'unocss'
import { presetScrollbar } from 'unocss-preset-scrollbar'

export default defineConfig({
  presets: [
    /* Core Presets */
    presetMini(),
    presetWind3(),
    presetIcons(),
    presetTypography(),
    presetWebFonts({
      provider: 'google',
      fonts: {
        noto: [
          'Noto Serif:400,700',
          'Noto Serif SC:400,700',
          'Noto Serif JP:400,700',
        ],
        code: ['JetBrains Mono'],
      },
    }),

    /* Community Presets */
    presetRemToPx(),
    presetScrollbar(),
  ],
  transformers: [transformerDirectives(), transformerVariantGroup()],
  rules: [
    ['background-grid', {
      'background-image': `linear-gradient(
        0deg,
        transparent 24%,
        var(--background-grid-color) 25%,
        var(--background-grid-color) 26%,
        transparent 27%,
        transparent 74%,
        var(--background-grid-color) 75%,
        var(--background-grid-color) 76%,
        transparent 77%
      ),
      linear-gradient(
        90deg,
        transparent 24%,
        var(--background-grid-color) 25%,
        var(--background-grid-color) 26%,
        transparent 27%,
        transparent 74%,
        var(--background-grid-color) 75%,
        var(--background-grid-color) 76%,
        transparent 77%
      )`,
      'background-size': '100px 100px',
    }],
    ['transition-bg-size', {
      'transition-property': 'background-size',
    }],
    ['transform-style-3d', {
      'transform-style': 'preserve-3d',
    }],
    [/^perspective-(\d+)$/, ([, d]) => {
      const value = d || '0'
      return { perspective: `${Number(value) * 100}px` }
    }],
  ],
  shortcuts: {
    'animate-bounce-x': 'animate-[bounce-x_1s_infinite]',
    'with-underline': 'cursor-pointer bg-gradient-to-r from-hana-blue to-hana-blue-200 bg-no-repeat bg-right-bottom bg-[length:0%_2px] transition-bg-size duration-500 hover:bg-left-bottom hover:bg-[length:100%_2px] dark:from-hana-blue-200 dark:to-hana-blue-200',
    'hana-button': 'flex shrink-0 cursor-pointer select-none items-center rounded-lg px-[10px] py-2 transition-all hover:bg-hana-blue-150 hover:text-hana-blue active:scale-95 active:bg-hana-blue-200 dark:hover:bg-hana-black-800 dark:hover:text-hana-blue-200 dark:active:bg-hana-black-800',
    'hana-button--active': 'bg-hana-blue-150 text-hana-blue dark:bg-hana-black-800 dark:text-hana-blue-200',
    'hana-button--disabled': 'cursor-not-allowed opacity-50',
    'hana-card': 'rounded-lg bg-white p-2 text-text shadow-md dark:bg-hana-black dark:text-hana-white-700',
    'hana-article-title': 'flex items-center gap-2 font-bold before:font-light before:text-hana-blue-200 before:content-["#"] hover:text-hana-blue dark:hover:text-hana-blue-200',
  },
  theme: {
    colors: {
      primary: {
        DEFAULT: 'oklch(0.73 0.0336 251.22)',
        100: 'oklch(0.95 0.0059 239.82)',
        200: 'oklch(0.91 0.011 234.83)',
        300: 'oklch(0.86 0.0181 240.03)',
        400: 'oklch(0.79 0.0259 246.28)',
        500: 'oklch(0.73 0.0336 251.22)',
        600: 'oklch(0.66 0.0398 259.78)',
        700: 'oklch(0.58 0.0386 261.85)',
        800: 'oklch(0.51 0.0317 260.26)',
        900: 'oklch(0.45 0.0237 260.13)',
      },
      hanaBlue: {
        DEFAULT: 'oklch(0.5 0.1102 250.04)',
        50: 'oklch(0.96 0.02 200.64)',
        100: 'oklch(0.93 0.0358 205.23)',
        150: 'oklch(0.93 0.0305 212.05)',
        200: 'oklch(0.84 0.0632 214.03)',
        300: 'oklch(0.75 0.0883 226.04)',
        400: 'oklch(0.64 0.1176 239.66)',
        500: 'oklch(0.5 0.1102 250.04)',
        600: 'oklch(0.41 0.1042 257.32)',
        700: 'oklch(0.33 0.0946 263.24)',
        800: 'oklch(0.26 0.0796 268.39)',
        900: 'oklch(0.19 0.0598 273.58)',
      },
      error: {
        DEFAULT: 'oklch(0.66 0.217 24.44)',
        0: 'oklch(0.96 0.022 24.44)',
        1: 'oklch(0.82 0.099566 21.7035)',
        2: 'oklch(0.75 0.1536 20.96)',
        3: 'oklch(0.66 0.217 24.44)',
        4: 'oklch(0.55 0.2051 24.53)',
      },
      text: {
        DEFAULT: 'oklch(0.16 0.0413 254.41 / 53.33%)',
        0: 'oklch(0.16 0.0413 254.41 / 53.33%)',
        1: 'oklch(0.57 0 0)',
        2: 'oklch(0.51 0 0)',
        3: 'oklch(0.42 0 0)',
        4: 'oklch(0.26 0 0)',
      },
      hanaBlack: {
        DEFAULT: 'oklch(0.36 0 0)',
        100: 'oklch(0.63 0 0)',
        200: 'oklch(0.59 0 0)',
        300: 'oklch(0.55 0 0)',
        400: 'oklch(0.5 0 0)',
        500: 'oklch(0.46 0 0)',
        600: 'oklch(0.41 0 0)',
        700: 'oklch(0.36 0 0)',
        800: 'oklch(0.27 0 0)',
        900: 'oklch(0.17 0 0)',
      },
      hanaWhite: {
        DEFAULT: 'oklch(0.98 0 0)',
        100: 'oklch(1 0 0)',
        200: 'oklch(0.98 0 0)',
        300: 'oklch(0.94 0 0)',
        400: 'oklch(0.9 0 0)',
        500: 'oklch(0.86 0 0)',
        600: 'oklch(0.82 0 0)',
        700: 'oklch(0.78 0 0)',
        800: 'oklch(0.74 0 0)',
        900: 'oklch(0.7 0 0)',
      },
    },
    animation: {
      keyframes: {
        'bounce-x': `0%, 100% {
          transform: translateX(-25%);
          animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
        }
        50% {
          transform: translateX(0);
          animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
        }`,
      },
    },
  },
  preflights: [
    {
      getCSS: () => `
        html,
        body {
          @apply font-noto min-w-80;
        }

        code,
        pre {
          @apply font-code;
        }

        ::selection {
          background-color: var(--selection-color);
        }

        :root {
          /* 背景网格颜色 */
          --background-grid-color: oklch(0.95 0.0059 239.82);
          --background-grid-color-dark: oklch(0.27 0 0);

          /* 选中文字颜色 */
          --selection-color: oklch(0.93 0.0358 205.23);
          --selection-color-dark: oklch(0.5 0.1102 250.04);
        }

        .dark {
          --background-grid-color: var(--background-grid-color-dark);
          --selection-color: var(--selection-color-dark);
        }
      `,
    },
  ],
})
