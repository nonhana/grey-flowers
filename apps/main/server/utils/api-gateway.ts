import type { ApiErrorCode } from '@grey-flowers/contracts'

import type { H3Event } from 'h3'

interface ApiSuccessBody<T> {
  success: true
  data: T
}

interface ApiFailureBody {
  success: false
  error: {
    code: ApiErrorCode
    fields?: Record<string, string[]>
    message: string
  }
}

type ApiBody<T> = ApiSuccessBody<T> | ApiFailureBody

export class ApiGatewayError extends Error {
  readonly code: ApiErrorCode
  readonly statusCode: number

  constructor(statusCode: number, code: ApiErrorCode, message: string) {
    super(message)
    this.statusCode = statusCode
    this.code = code
  }
}

/**
 * 主站 → Hono API 的只读薄适配。只负责把 `{ success, data }` 信封
 * 展开为数据，或把可处理失败转成 ApiGatewayError；不承载业务规则。
 */
export async function apiGet<T>(
  path: string,
  query?: Record<string, string | number | undefined | null>,
): Promise<T> {
  const { public: { apiOrigin } } = useRuntimeConfig()
  const url = new URL(`${apiOrigin}${path}`)

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === '')
      continue
    url.searchParams.set(key, String(value))
  }

  const response = await fetch(url.toString(), {
    headers: { accept: 'application/json' },
  })

  let body: ApiBody<T>
  try {
    body = await response.json() as ApiBody<T>
  }
  catch {
    throw new ApiGatewayError(response.status, 'INTERNAL_ERROR', 'Malformed API response')
  }

  if (body.success) {
    return body.data
  }

  throw new ApiGatewayError(
    response.status,
    body.error.code,
    body.error.message,
  )
}

export function isApiNotFound(error: unknown) {
  return error instanceof ApiGatewayError && error.code === 'NOT_FOUND'
}

/**
 * 主站 → Hono API 的写/认证适配器。只改写路径与 Bearer 透传：
 * 主站 auth middleware 已先校验 principal，这里把 `Authorization` 原样转发
 * 给 API（API 侧自行二次校验），不承载任何业务规则。
 */
export async function apiMutate<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  options: { body?: unknown, event: H3Event },
): Promise<T> {
  const { public: { apiOrigin } } = useRuntimeConfig()
  const url = `${apiOrigin}${path}`

  const headers: Record<string, string> = { accept: 'application/json' }
  if (options.body !== undefined)
    headers['content-type'] = 'application/json'

  const authorization = options.event.headers.get('Authorization')
  if (authorization)
    headers.authorization = authorization

  const response = await fetch(url, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  let body: ApiBody<T>
  try {
    body = await response.json() as ApiBody<T>
  }
  catch {
    throw new ApiGatewayError(response.status, 'INTERNAL_ERROR', 'Malformed API response')
  }

  if (body.success) {
    return body.data
  }

  throw new ApiGatewayError(
    response.status,
    body.error.code,
    body.error.message,
  )
}
