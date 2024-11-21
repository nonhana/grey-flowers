// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
    layoutTransition: { name: 'layout', mode: 'out-in' },
  },
  ssr: true,
  content: {
    highlight: {
      langs: ['bat', 'c', 'cpp', 'css', 'diff', 'html', 'ini', 'java', 'js', 'json', 'log', 'makefile', 'matlab', 'md', 'mdc', 'powershell', 'python', 'sh', 'ssh-config', 'toml', 'ts', 'tsx', 'vb', 'vue', 'xml', 'yaml', 'jsx', 'scss', 'prisma', 'nginx', 'dockerfile', 'http'],
      theme: 'github-dark',
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
    formats: ['webp', 'avif'],
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
  auth: {
    isEnabled: true,
    disableServerSideAuth: false,
    originEnvKey: 'HANA_AUTH_ORIGIN',
    baseURL: 'http://localhost:2408/api/auth',
    provider: {
      type: 'local',
      endpoints: {
        signIn: { path: '/login', method: 'post' },
        signOut: { path: '/logout', method: 'post' },
        signUp: { path: '/register', method: 'post' },
        getSession: { path: '/session', method: 'get' },
      },
      refresh: {
        isEnabled: true,
        endpoint: { path: '/refresh', method: 'post' },
        refreshOnlyToken: true,
        token: {
          signInResponseRefreshTokenPointer: '/refresh-token',
          refreshRequestTokenPointer: '/refresh-token',
          maxAgeInSeconds: 60 * 60 * 24 * 7,
        },
      },
    },
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
    '@vueuse/nuxt',
    '@pinia/nuxt',
    '@sidebase/nuxt-auth',
  ],
  plugins: ['~/plugins/directives.ts'],
  devtools: { enabled: true },
  compatibilityDate: '2024-10-05',
})
