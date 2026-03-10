import env from '~/server/env'

export default formattedEventHandler(async (event) => {
  const header = getHeader(event, 'x-webhook-secret')
  if (header !== env.WEBHOOK_SECRET) {
    return {
      statusCode: 401,
      statusMessage: 'Invalid webhook key',
      success: false,
    }
  }
  const body = await readBody(event)

  // 文章发布时，直接清除所有的缓存
  if (body.event === 'article_published') {
    await useStorage('cache').clear()
  }

  return {
    statusCode: 200,
    statusMessage: '缓存已清除',
    success: true,
  }
})
