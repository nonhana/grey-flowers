// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
    layoutTransition: { name: 'layout', mode: 'out-in' },
  },
  ssr: true,
  content: {
    highlight: {
      theme: {
        default: 'github-dark',
      },
    },
  },
  devServer: {
    host: '127.0.0.1',
    port: 2408,
  },
  experimental: {
    scanPageMeta: true,
  },
  typescript: {
    strict: true,
  },
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler',
        },
      },
    },
  },
  css: ['~/assets/css/index.scss'],
  tailwindcss: {
    exposeConfig: true,
    viewer: false,
  },
  i18n: {
    langDir: './language',
    locales: [
      {
        code: 'en-us',
        language: 'en-US',
        file: 'en.json',
      },
      {
        code: 'ja-jp',
        language: 'ja-jp',
        file: 'ja-jp.json',
      },
      {
        code: 'zh-cn',
        language: 'zh-cn',
        file: 'zh-cn.json',
      },
    ],
    defaultLocale: 'en-us',
    strategy: 'prefix_except_default',
    restructureDir: false,
  },
  googleFonts: {
    families: {
      'Noto+Sans': [400, 700],
      'Noto+Sans+SC': [400, 700],
      'Noto+Sans+JP': [400, 700],
    },
    display: 'swap',
    preload: true,
    download: true,
  },
  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/i18n',
    '@nuxt/icon',
    '@nuxtjs/google-fonts',
    'nuxt-lodash',
    '@nuxt/image',
    '@nuxt/content',
    '@nuxtjs/seo',
  ],
  plugins: ['~/plugins/directives.ts', '~/plugins/formik.client.ts'],
  devtools: { enabled: true },
  compatibilityDate: '2024-10-05',
})
