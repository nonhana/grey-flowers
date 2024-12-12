import { seoData } from './data'

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
  sitemap: {
    strictNuxtContentPaths: true,
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
      routes: ['/'],
    },
  },
  content: {
    highlight: {
      langs: ['bat', 'c', 'cpp', 'css', 'diff', 'html', 'ini', 'java', 'js', 'json', 'log', 'makefile', 'matlab', 'md', 'mdc', 'powershell', 'python', 'sh', 'ssh-config', 'toml', 'ts', 'tsx', 'vb', 'vue', 'xml', 'yaml', 'jsx', 'scss', 'prisma', 'nginx', 'dockerfile', 'http'],
      theme: 'github-light',
    },
    markdown: {
      toc: {
        depth: 2,
      },
    },
  },
  image: {
    dir: 'public',
    quality: 85,
    formats: ['webp', 'gif', 'jpeg', 'png', 'avif'],
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
  googleFonts: {
    families: {
      'Noto+Serif': [500, 700],
      'Noto+Serif+SC': [500, 700],
      'Noto+Serif+JP': [500, 700],
    },
    display: 'swap',
    preload: true,
    download: true,
  },
  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxt/icon',
    '@nuxtjs/google-fonts',
    '@nuxt/image',
    '@nuxt/content',
    '@nuxtjs/seo',
    '@vueuse/nuxt',
    '@pinia/nuxt',
    'pinia-plugin-persistedstate/nuxt',
  ],
  plugins: ['~/plugins/directives.ts'],
  devtools: { enabled: true },
  compatibilityDate: '2024-10-05',
})
