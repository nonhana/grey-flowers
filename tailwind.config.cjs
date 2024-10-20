/** @type {import('tailwindcss/types')} */
module.exports = {
  mode: 'jit',
  darkMode: 'class',
  content: [],
  theme: {
    extend: {
      colors: {
        'primary': {
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
        'great-blue': {
          DEFAULT: '#2A669F',
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
      boxShadow: {
        bottom: '0 2px 4px 0 rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
  ],
}
