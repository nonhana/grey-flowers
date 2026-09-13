import { commentDeleteResultSchema } from '@grey-flowers/contracts'
import { z } from 'zod'

const commentDeleteBodySchema = z.object({ commentId: z.coerce.number().int().positive() }).strict()

export default formattedEventHandler(async (event) => {
  const { commentId } = await parsePublicBody(commentDeleteBodySchema, event)

  try {
    const result = await apiMutate(
      'DELETE',
      `/public/comments/${commentId}`,
      { event },
      commentDeleteResultSchema,
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
