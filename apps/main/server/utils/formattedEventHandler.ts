import type { H3Event } from 'h3'
import type { LegacyEnvelope } from '#shared/legacy-envelope'

type HandlerResponse<T = unknown> = Partial<LegacyEnvelope<T>>

function getErrorStatus(value: unknown): number | undefined {
  if (
    typeof value === 'object'
    && value !== null
    && 'statusCode' in value
    && typeof value.statusCode === 'number'
    && Number.isInteger(value.statusCode)
  ) {
    return value.statusCode
  }
  return undefined
}

function getErrorStatusMessage(value: unknown): string | undefined {
  if (value instanceof Error) {
    return value.message
  }
  if (
    typeof value === 'object'
    && value !== null
    && 'statusMessage' in value
    && typeof value.statusMessage === 'string'
  ) {
    return value.statusMessage
  }
  return undefined
}

export function formattedEventHandler<T>(
  handler: (event: H3Event) => Promise<HandlerResponse<T> | void> | HandlerResponse<T> | void,
) {
  return defineEventHandler(
    async (event): Promise<LegacyEnvelope<T> | LegacyEnvelope<null>> => {
      try {
        const res = await handler(event)

        if (res === undefined) {
          setResponseStatus(event, 200)
          return { statusCode: 200, statusMessage: 'OK', success: true, payload: null, error: null }
        }

        const { statusCode, statusMessage, success, payload, error } = res
        const formattedPayload = payload ?? null
        const formattedError = error ?? null
        const status = statusCode || 200

        // body 与真实 HTTP 状态保持同步：404/500 不再被吞成 200（软 404 / 隐藏 5xx）。
        setResponseStatus(event, status)

        return {
          statusCode: status,
          statusMessage: statusMessage || 'OK',
          success: success ?? true,
          payload: formattedPayload,
          error: formattedError,
        }
      }
      catch (rawError: unknown) {
        const status = getErrorStatus(rawError) ?? 500
        setResponseStatus(event, status)
        return {
          statusCode: status,
          statusMessage: getErrorStatusMessage(rawError) ?? 'Internal Server Error',
          success: false,
          payload: null,
          error: getErrorStatusMessage(rawError) ?? rawError,
        }
      }
    },
  )
}
