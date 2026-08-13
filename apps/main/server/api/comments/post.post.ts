import type { CommentPublic } from '@grey-flowers/contracts'
import { ApiGatewayError, apiMutate } from '#server/utils/api-gateway'

export default formattedEventHandler(async (event) => {
  const body = await readBody(event)

  try {
    const comment = await apiMutate<CommentPublic>('POST', '/public/comments', {
      event,
      body,
    })
    return { payload: comment }
  }
  catch (error) {
    if (error instanceof ApiGatewayError) {
      // VALIDATION_FAILED → 400（statusMessage 用 API 中文文案）；
      // AUTH_REQUIRED / AUTH_FORBIDDEN → 透传原 401 / 403。
      return {
        statusCode: error.statusCode,
        statusMessage: error.message,
        success: false,
      }
    }
    throw error
  }
})
