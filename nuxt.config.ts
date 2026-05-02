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
    name: seoData.siteName,
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
  mdc: {
    highlight: {
      langs: ['bat', 'c', 'cpp', 'css', 'diff', 'html', 'ini', 'java', 'js', 'json', 'log', 'makefile', 'matlab', 'md', 'mdc', 'powershell', 'python', 'sh', 'ssh-config', 'toml', 'ts', 'tsx', 'vb', 'vue', 'xml', 'yaml', 'jsx', 'scss', 'prisma', 'nginx', 'dockerfile', 'http', 'javascript', 'typescript'],
      theme: {
        default: 'github-light',
        dark: 'github-dark',
      },
    },
    components: {
      prose: true,
    },
  },
  image: {
    domains: ['blog-r2.caelum.moe'],
    dir: 'public',
    quality: 85,
    format: ['webp', 'gif', 'jpeg', 'png', 'avif'],
  },
  ogImage: { zeroRuntime: true },
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
  vite: {
    optimizeDeps: {
      include: [
        'hana-img-viewer',
        'dayjs', // CJS
        'gsap',
        'vivus', // CJS
        'lucide-vue-next',
        'clipboard',
      ],
    },
  },
  modules: [
    '@nuxt/icon',
    '@nuxt/image',
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
  sitemap: { zeroRuntime: true },
  compatibilityDate: '2024-10-05',
})
