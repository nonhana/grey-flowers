import process from 'node:process'
import { seoData } from './shared/data/meta'

const mainPort = Number.parseInt(process.env.MAIN_PORT ?? '2410')
const apiPort = Number.parseInt(process.env.API_PORT ?? '2408')
const apiOrigin = process.env.NODE_ENV === 'production'
  ? 'https://api.caelum.moe'
  : `http://localhost:${apiPort}`

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      apiOrigin,
    },
  },
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
    name: seoData.siteName,
    url: seoData.mySite,
    identity: {
      type: 'Person',
    },
  },
  nitro: {
    prerender: {
      crawlLinks: true,
      ignore: ['/_ipx/'],
      routes: ['/', '/rss.xml'],
    },
  },
  mdc: {
    highlight: {
      langs: ['c', 'cpp', 'css', 'diff', 'dockerfile', 'html', 'http', 'ini', 'java', 'js', 'json', 'jsx', 'log', 'makefile', 'md', 'nginx', 'prisma', 'scss', 'sh', 'ssh-config', 'toml', 'ts', 'tsx', 'vue', 'xml', 'yaml'],
      theme: {
        default: 'github-light',
        light: 'github-light',
        dark: 'github-dark',
      },
    },
    components: {
      prose: true,
    },
  },
  image: {
    domains: [
      'blog-r2.caelum.moe',
      'picgo-r2.caelum.moe',
      'static-r2.caelum.moe',
      'weavatar.com',
    ],
    quality: 78,
    format: ['avif', 'webp'],
    presets: {
      articleBodyPreview: {
        modifiers: {
          width: 1280,
        },
      },
    },
  },
  ogImage: {
    zeroRuntime: true,
    security: {
      renderTimeout: 60000,
    },
  },
  devServer: {
    host: 'localhost',
    port: mainPort,
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
  css: ['@unocss/reset/tailwind.css', 'hana-img-viewer/style.css'],
  postcss: {
    plugins: {
      cssnano: { plugins: [] }, // 禁用压缩 CSS 插件，避免 build 时无法解析某些 CSS 规则
    },
  },
  vite: {
    optimizeDeps: {
      include: [
        'hana-img-viewer',
        'gsap',
        'vivus', // CJS
        '@lucide/vue',
      ],
    },
  },
  modules: [
    '@nuxt/fonts',
    '@nuxt/image',
    '@nuxtjs/mdc',
    '@nuxtjs/seo',
    '@nuxtjs/color-mode',
    '@vueuse/nuxt',
    '@pinia/nuxt',
    'pinia-plugin-persistedstate/nuxt',
    '@unocss/nuxt',
  ],
  fonts: {
    provider: 'google',
    defaults: {
      styles: ['normal'],
    },
    families: [
      {
        name: 'Noto Serif SC',
        provider: 'google',
        global: true,
        weights: [400, 700],
      },
      {
        name: 'JetBrains Mono',
        provider: 'google',
        global: true,
        weights: [400],
      },
    ],
  },
  devtools: {
    enabled: true,
    timeline: {
      enabled: true,
    },
  },
  linkChecker: { enabled: false }, // 中文网站无需检查链接
  sitemap: { zeroRuntime: true },
  compatibilityDate: '2024-10-05',
})
