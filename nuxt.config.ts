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
    format: ['webp', 'gif', 'jpeg', 'png', 'avif'],
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
  colorMode: {
    classSuffix: '',
  },
  css: ['@unocss/reset/tailwind.css'],
  postcss: {
    plugins: {
      cssnano: { plugins: [] }, // 禁用压缩 CSS 插件，避免 build 时无法解析某些 CSS 规则
    },
  },
  modules: [
    '@nuxt/icon',
    '@nuxt/image',
    '@nuxt/content',
    '@nuxtjs/mdc',
    '@nuxtjs/seo',
    '@nuxtjs/color-mode',
    '@vueuse/nuxt',
    '@pinia/nuxt',
    'pinia-plugin-persistedstate/nuxt',
    '@unocss/nuxt',
  ],
  devtools: { enabled: true },
  linkChecker: { enabled: false }, // 中文网站无需检查链接
  compatibilityDate: '2024-10-05',
})
