module.exports = {
  mode: 'jit',
  darkMode: 'class',
  content: [],
  theme: {
    extend: {
      colors: {
        'primary': {
          DEFAULT: '#98a9bc',
          100: '#ecf0f3',
          200: '#dce4e9',
          300: '#c6d2db',
          400: '#aebdcb',
          500: '#98a9bc',
          600: '#8392aa',
          700: '#6f7c93',
          800: '#5b6678',
          900: '#4d5562',
        },
        'hana-blue': {
          DEFAULT: '#2A669F', // 默认主题色，按钮、文字等激活状态
          50: '#E4F7F8',
          100: '#CCEEF2',
          150: '#D1EDF3',
          200: '#9CD7E5',
          300: '#6CB9D8',
          400: '#3B94CB',
          500: '#2A669F',
          600: '#234B83',
          700: '#1B3366',
          800: '#14204A',
          900: '#0C102E',
        },
        'error': {
          0: '#ffebe9',
          1: '#ffaba8',
          2: '#ff8182',
          3: '#fa4549',
          4: '#cf222e',
        },
        'text': {
          DEFAULT: '#020d1e88', // 默认文本颜色
          0: '#020d1e88',
          1: '#777777',
          2: '#666666',
          3: '#4d4d4d',
          4: '#242424',
        },
        'hana-black': {
          DEFAULT: '#3D3D3D',
          100: '#8A8A8A',
          200: '#7D7D7D',
          300: '#707070',
          400: '#636363',
          500: '#575757',
          600: '#4A4A4A',
          700: '#3D3D3D',
          800: '#262626',
          900: '#0F0F0F',
        },
        'hana-white': {
          DEFAULT: '#F7F7F7',
          100: '#FFFFFF',
          200: '#F7F7F7',
          300: '#EAEAEA',
          400: '#DDDDDD',
          500: '#D1D1D1',
          600: '#C4C4C4',
          700: '#B7B7B7',
          800: '#AAAAAA',
          900: '#9D9D9D',
        },
      },
      fontFamily: {
        noto: ['Noto Serif', 'Noto Serif SC', 'Noto Serif JP', 'sans-serif'],
        code: ['Fira Code', 'consolas', 'monospace', 'Microsoft YaHei UI'],
      },
      keyframes: {
        'bounce-x': {
          '0%, 100%': {
            transform: 'translateX(-25%)',
            animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)',
          },
          '50%': {
            transform: 'translateX(0)',
            animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
          },
        },
      },
      animation: {
        'bounce-x': 'bounce-x 1s infinite',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@kamona/tailwindcss-perspective'),
    function ({ addUtilities }) {
      addUtilities({
        '.with-underline': {
          cursor: 'pointer',
          background: 'linear-gradient(to right, #2A669F, #2A669F) no-repeat right bottom',
          backgroundSize: '0% 2px',
          transition: 'background-size 0.5s',
        },
        '.dark': {
          '.with-underline': {
            cursor: 'pointer',
            background: 'linear-gradient(to right, #9CD7E5, #9CD7E5) no-repeat right bottom',
            backgroundSize: '0% 2px',
            transition: 'background-size 0.5s',
          },
        },
        '.with-underline:hover': {
          backgroundPosition: 'left bottom',
          backgroundSize: '100% 2px',
        },
        '.scrollbar-hidden': {
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },
        '.scrollbar-sticky': {
          '&::-webkit-scrollbar': {
            position: 'sticky',
          },
        },
        '.background-grid': {
          'background-image': `linear-gradient(
            0deg,
            transparent 24%,
            #ecf0f3 25%,
            #ecf0f3 26%,
            transparent 27%,
            transparent 74%,
            #ecf0f3 75%,
            #ecf0f3 76%,
            transparent 77%
          ),
          linear-gradient(
            90deg,
            transparent 24%,
            #ecf0f3 25%,
            #ecf0f3 26%,
            transparent 27%,
            transparent 74%,
            #ecf0f3 75%,
            #ecf0f3 76%,
            transparent 77%
          )`,
          'background-size': '100px 100px',
        },
        '.background-grid-dark': {
          'background-image': `linear-gradient(
            0deg,
            transparent 24%,
            #262626 25%,
            #262626 26%,
            transparent 27%,
            transparent 74%,
            #262626 75%,
            #262626 76%,
            transparent 77%
          ),
          linear-gradient(
            90deg,
            transparent 24%,
            #262626 25%,
            #262626 26%,
            transparent 27%,
            transparent 74%,
            #262626 75%,
            #262626 76%,
            transparent 77%
          )`,
          'background-size': '100px 100px',
        },
      })
    },
    function ({ addComponents }) {
      addComponents({
        '.hana-button': {
          '@apply flex shrink-0 cursor-pointer select-none items-center justify-between rounded-lg px-[10px] py-2 transition-all hover:bg-hana-blue-150 hover:text-hana-blue active:scale-95 active:bg-hana-blue-200 dark:hover:bg-hana-black-800 dark:hover:text-hana-blue-200 dark:active:bg-hana-black-800': {},
        },
        '.hana-button--active': {
          '@apply bg-hana-blue-150 text-hana-blue dark:bg-hana-black-800 dark:text-hana-blue-200': {},
        },
        '.hana-button--disabled': {
          '@apply cursor-not-allowed opacity-50': {},
        },
        '.hana-card': {
          '@apply rounded-lg bg-white p-2 text-text shadow-md dark:bg-hana-black dark:text-hana-white-700': {},
        },
        '.hana-article-title': {
          '@apply flex items-center gap-2 font-bold before:font-light before:text-hana-blue-200 before:content-[\'#\'] hover:text-hana-blue dark:hover:text-hana-blue-200': {},
        },
      })
    },
  ],
}
