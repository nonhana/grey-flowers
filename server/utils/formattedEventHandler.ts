interface ApiResponse<T, S> {
  statusCode: number
  statusMessage: string
  success: boolean
  payload: T
  error: S
}

interface HandlerResponse<T, S> {
  statusCode?: number
  statusMessage?: string
  success?: boolean
  payload?: T
  error?: S
}

export function formattedEventHandler<T, S>(
  handler: (event: any) => Promise<HandlerResponse<T, S> | void> | HandlerResponse<T, S> | void,
) {
  return defineEventHandler(async (event): Promise<ApiResponse<T | null, S | null>> => {
    try {
      const res = await handler(event)

      if (res === undefined) {
        return {
          statusCode: 200,
          statusMessage: 'OK',
          success: true,
          payload: null,
          error: null,
        } as ApiResponse<null, null>
      }

      const { statusCode, statusMessage, success, payload, error } = res

      const formattedPayload = payload === undefined || payload === null ? null : payload
      const formattedError = error === undefined || error === null ? null : error

      return {
        statusCode: statusCode || 200,
        statusMessage: statusMessage || 'OK',
        success: success ?? true,
        payload: formattedPayload,
        error: formattedError,
      } as ApiResponse<T extends void ? null : T, S extends void ? null : S>
    }
    catch (error: any) {
      return {
        statusCode: error.statusCode || 500,
        statusMessage: error.statusMessage || 'Internal Server Error',
        success: false,
        payload: null,
        error: error.message || error,
      } as ApiResponse<null, any>
    }
  })
}
