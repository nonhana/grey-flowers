/**
 * 草稿预览防泄密：preview token 只在 SSR 时可见（query），防泄密 header 必须
 * 落在最终页面响应上 —— 内部 API 路由（server/api/articles/detail.get.ts）
 * 里设置的 header 不会冒泡到最终 HTML。中间件按「文章路径 + ?preview=」判据
 * 写最终响应：草稿永不进缓存/索引、token 不进 Referer。
 */
export default defineEventHandler((event) => {
  const url = getRequestURL(event)
  if (!url.pathname.startsWith('/articles/') || !url.searchParams.has('preview')) {
    return
  }

  // token 不进缓存 / Referer。noindex 交给页面里的 <meta name="robots">
  // （@nuxtjs/seo 会在响应末段改写 X-Robots-Tag，header 在此会被覆盖）。
  setResponseHeader(event, 'Cache-Control', 'no-store')
  setResponseHeader(event, 'Referrer-Policy', 'no-referrer')
})
