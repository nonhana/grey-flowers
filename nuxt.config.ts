import { defineNuxtConfig } from 'nuxt/config'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
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
        language: 'ja-JP',
        file: 'ja-JP.json',
      },
      {
        code: 'zh-cn',
        language: 'zh-CN',
        file: 'zh-CN.json',
      },
    ],
    defaultLocale: 'en-us',
    strategy: 'prefix_except_default',
    restructureDir: false,
  },
  modules: ['@nuxtjs/tailwindcss', '@nuxtjs/i18n', '@nuxt/icon', '@nuxtjs/google-fonts'],
  devtools: { enabled: true },
  compatibilityDate: '2024-10-05',
})
