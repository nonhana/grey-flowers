import { commentCreateInputSchema, commentPublicSchema } from '@grey-flowers/contracts'

export default formattedEventHandler(async (event) => {
  const input = await parsePublicBody(commentCreateInputSchema, event)

  try {
    const comment = await apiMutate('POST', '/public/comments', {
      event,
      body: input,
    }, commentPublicSchema)
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
