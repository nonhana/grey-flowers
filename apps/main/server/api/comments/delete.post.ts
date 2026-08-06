import type { CommentDeleteResult } from '@grey-flowers/contracts'
import { ApiGatewayError, apiMutate } from '#server/utils/api-gateway'

export default formattedEventHandler(async (event) => {
  const body = await readBody(event) as { commentId?: number }
  const commentId = Number(body.commentId)
  if (!Number.isInteger(commentId) || commentId < 1) {
    return {
      statusCode: 400,
      statusMessage: 'Invalid comment id',
      success: false,
    }
  }

  try {
    const result = await apiMutate<CommentDeleteResult>(
      'DELETE',
      `/public/comments/${commentId}`,
      { event },
    )
    return { payload: result }
  }
  catch (error) {
    if (error instanceof ApiGatewayError) {
      // NOT_FOUND → 404 envelope；AUTH_FORBIDDEN → 403 envelope。
      return {
        statusCode: error.statusCode,
        statusMessage: error.message,
        success: false,
      }
    }
    throw error
  }
})
