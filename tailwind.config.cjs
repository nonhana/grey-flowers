/** @type {import('tailwindcss/types')} */
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
      },
      dark: {
        primary: {
          100: '#e7e7e7',
          200: '#d1d1d1',
          300: '#b0b0b0',
          400: '#888888',
          500: '#6d6d6d',
          600: '#5d5d5d',
          700: '#4f4f4f',
          800: '#454545',
          900: '#3d3d3d',
        },
        error: {
          0: '#ffebe9',
          1: '#ffaba8',
          2: '#ff8182',
          3: '#fa4549',
          4: '#cf222e',
        },
        text: {
          0: '#e5e5e5',
          1: '#cccccc',
          2: '#b3b3b3',
          3: '#999999',
        },
      },
      fontFamily: {
        noto: ['Noto Sans', 'Noto Sans SC', 'Noto Sans JP', 'sans-serif'],
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
    require('@tailwindcss/typography'),
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
      })
    },
    function ({ addComponents }) {
      addComponents({
        '.hana-button': {
          '@apply flex shrink-0 cursor-pointer select-none items-center justify-between rounded-lg px-[10px] py-2 transition-all hover:bg-hana-blue-200/40 hover:text-hana-blue active:scale-95 active:bg-hana-blue-200': {},
        },
        '.hana-button--active': {
          '@apply bg-hana-blue-200/40 text-hana-blue': {},
        },
        '.hana-button--disabled': {
          '@apply cursor-not-allowed opacity-50': {},
        },
        '.hana-card': {
          '@apply rounded-lg bg-white p-2 text-text shadow-md': {},
        },
        '.hana-article-title': {
          '@apply flex items-center gap-2 font-bold before:font-light before:text-hana-blue-200 before:content-[\'#\'] hover:text-hana-blue': {},
        },
      })
    },
  ],
}
