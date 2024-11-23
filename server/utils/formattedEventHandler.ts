interface ApiResponse<T> {
  statusCode: number
  statusMessage: string
  success: boolean
  payload: T
}

interface HandlerResponse<T> {
  statusCode?: number
  statusMessage?: string
  success?: boolean
  payload?: T
}

export function formattedEventHandler<T>(
  handler: (event: any) => Promise<HandlerResponse<T> | void> | HandlerResponse<T> | void,
) {
  return defineEventHandler(async (event) => {
    try {
      const res = await handler(event)

      if (res === undefined) {
        return {
          statusCode: 200,
          statusMessage: 'OK',
          success: true,
          payload: null,
        } satisfies ApiResponse<null>
      }

      const { statusCode, statusMessage, success, payload } = res

      const formattedPayload = (payload === undefined || payload === null
        ? (null as T extends void ? null : T)
        : payload) as T extends void ? null : T

      return {
        statusCode: statusCode || 200,
        statusMessage: statusMessage || 'OK',
        success: success ?? true,
        payload: formattedPayload,
      } satisfies ApiResponse<T extends void ? null : T>
    }
    catch (error: any) {
      return {
        statusCode: error.statusCode || 500,
        statusMessage: error.statusMessage || 'Internal Server Error',
        success: false,
        payload: null,
      } satisfies ApiResponse<null>
    }
  })
}
