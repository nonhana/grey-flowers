import { seoData } from './data/meta'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  app: {
    head: {
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      title: seoData.title,
    },
    pageTransition: { name: 'page', mode: 'out-in' },
    layoutTransition: { name: 'layout', mode: 'out-in' },
  },
  site: {
    url: seoData.mySite,
    identity: {
      type: 'Person',
    },
  },
  nitro: {
    prerender: {
      crawlLinks: true,
      routes: ['/', '/rss.xml'],
    },
  },
  content: {
    build: {
      markdown: {
        highlight: {
          langs: ['bat', 'c', 'cpp', 'css', 'diff', 'html', 'ini', 'java', 'js', 'json', 'log', 'makefile', 'matlab', 'md', 'mdc', 'powershell', 'python', 'sh', 'ssh-config', 'toml', 'ts', 'tsx', 'vb', 'vue', 'xml', 'yaml', 'jsx', 'scss', 'prisma', 'nginx', 'dockerfile', 'http', 'javascript', 'typescript'],
          theme: {
            default: 'github-light',
            dark: 'github-dark',
          },
        },
        toc: {
          depth: 2,
        },
      },
    },
  },
  image: {
    dir: 'public',
    quality: 85,
    formats: ['webp', 'gif', 'jpeg', 'png', 'avif'],
  },
  devServer: {
    host: 'localhost',
    port: 2408,
  },
  experimental: {
    scanPageMeta: true,
  },
  typescript: {
    strict: true,
  },
  fonts: {
    families: [
      { name: 'Noto Serif', provider: 'google', weights: [500, 700] },
      { name: 'Noto Serif SC', provider: 'google', weights: [500, 700] },
      { name: 'Noto Serif JP', provider: 'google', weights: [500, 700] },
    ],
  },
  colorMode: {
    classSuffix: '',
  },
  css: ['@unocss/reset/tailwind.css'],
  modules: [
    '@nuxt/icon',
    '@nuxt/fonts',
    '@nuxt/image',
    '@nuxt/content',
    '@nuxtjs/seo',
    '@nuxtjs/color-mode',
    '@vueuse/nuxt',
    '@pinia/nuxt',
    'pinia-plugin-persistedstate/nuxt',
    '@unocss/nuxt',
  ],
  plugins: ['~/plugins/directives.ts'],
  devtools: { enabled: true },
  compatibilityDate: '2024-10-05',
})
