import type {
  ApiEnvelope,
  AuthLoginData,
  AuthLoginInput,
  AuthLogoutData,
  AuthRefreshData,
  AuthRegisterData,
  AuthRegisterInput,
  AuthSessionData,
  AuthUpdateMeData,
  AuthUpdateMeInput,
} from '@grey-flowers/contracts'
import type { ZodType } from 'zod'
import type { LegacyEnvelope } from '#shared/legacy-envelope'
import {
  apiEnvelopeSchema,
  authLoginDataSchema,
  authLogoutDataSchema,
  authRefreshDataSchema,
  authRegisterDataSchema,
  authSessionDataSchema,
  authUpdateMeDataSchema,
} from '@grey-flowers/contracts'
import { legacyEnvelopeSchema } from '#shared/legacy-envelope'
import { useUserInfoStore } from '~/stores/modules/user'

const accessTokenStorageKey = 'gf.access_token'
const legacyTokenStorageKey = 'token'

const authLoginEnvelopeSchema = apiEnvelopeSchema(authLoginDataSchema)
const authLogoutEnvelopeSchema = apiEnvelopeSchema(authLogoutDataSchema)
const authRefreshEnvelopeSchema = apiEnvelopeSchema(authRefreshDataSchema)
const authRegisterEnvelopeSchema = apiEnvelopeSchema(authRegisterDataSchema)
const authSessionEnvelopeSchema = apiEnvelopeSchema(authSessionDataSchema)
const authUpdateMeEnvelopeSchema = apiEnvelopeSchema(authUpdateMeDataSchema)

let refreshPromise: Promise<ApiEnvelope<AuthRefreshData>> | undefined

interface ApiRequestOptions {
  body?: unknown
  credentials?: RequestCredentials
  headers?: HeadersInit
  method?: 'GET' | 'PATCH' | 'POST'
  query?: Record<string, string | number | undefined>
}

function withQuery(path: string, query?: Record<string, string | number | undefined>) {
  if (!query) {
    return path
  }

  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      search.set(key, String(value))
    }
  }

  const qs = search.toString()
  return qs ? `${path}?${qs}` : path
}

type ResponseParser<T> = (value: unknown) => T

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isAuthRequired(value: unknown): boolean {
  if (!isRecord(value) || value.success !== false)
    return false

  if (value.statusCode === 401)
    return true

  return isRecord(value.error) && value.error.code === 'AUTH_REQUIRED'
}

function parseLegacyMainResponse<T>(value: unknown): LegacyEnvelope<T> {
  const parsed = legacyEnvelopeSchema.safeParse(value)
  if (!parsed.success) {
    throw new Error('主站接口返回了无效响应。')
  }

  // 信封 → 载荷的唯一边界断言：形状已由 legacyEnvelopeSchema 校验，此处仅收窄 payload 泛型。
  return parsed.data as LegacyEnvelope<T>
}

function parseResponse<T>(schema: ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value)
  if (!parsed.success)
    throw new Error('认证接口返回了无效响应。')

  return parsed.data
}

function createResponseParser<T>(schema: ZodType<T>): ResponseParser<T> {
  return value => parseResponse(schema, value)
}

export function useApiClient() {
  const config = useRuntimeConfig()
  const apiOrigin = config.public.apiOrigin.replace(/\/$/, '')
  const userStore = useUserInfoStore()

  function getAccessToken() {
    if (!import.meta.client)
      return undefined

    return localStorage.getItem(accessTokenStorageKey) ?? undefined
  }

  function clearSession() {
    if (import.meta.client) {
      localStorage.removeItem(accessTokenStorageKey)
      localStorage.removeItem(legacyTokenStorageKey)
    }
    userStore.logout()
  }

  function storeAuthenticatedSession(data: AuthLoginData | AuthRefreshData) {
    if (import.meta.client) {
      localStorage.setItem(accessTokenStorageKey, data.accessToken)
      localStorage.removeItem(legacyTokenStorageKey)
    }
    userStore.setUserInfo(data.principal)
  }

  async function requestJson<T>(
    url: string,
    options: ApiRequestOptions,
    parse: ResponseParser<T>,
  ): Promise<T> {
    const headers = new Headers(options.headers)
    if (options.body !== undefined)
      headers.set('Content-Type', 'application/json')

    const response = await fetch(url, {
      method: options.method ?? 'GET',
      headers,
      credentials: options.credentials ?? 'omit',
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
    const payload = await response.json().catch(() => {
      throw new Error('接口没有返回 JSON 响应。')
    })

    return parse(payload)
  }

  async function requestApi<T>(
    path: string,
    options: ApiRequestOptions,
    parse: ResponseParser<T>,
  ): Promise<T> {
    return requestJson(`${apiOrigin}${path}`, options, parse)
  }

  async function refreshAccessToken(): Promise<ApiEnvelope<AuthRefreshData>> {
    if (!refreshPromise) {
      refreshPromise = requestApi('/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      }, createResponseParser(authRefreshEnvelopeSchema))
        .then((response) => {
          if (response.success) {
            storeAuthenticatedSession(response.data)
          }
          else {
            clearSession()
          }

          return response
        })
        .finally(() => {
          refreshPromise = undefined
        })
    }

    return refreshPromise
  }

  async function requestWithAccessToken<T extends { success: boolean }>(
    request: (accessToken: string) => Promise<T>,
  ): Promise<T> {
    const accessToken = getAccessToken()
    if (!accessToken)
      throw new Error('登录状态已失效。')

    const initialResponse = await request(accessToken)
    if (!isAuthRequired(initialResponse))
      return initialResponse

    const refreshed = await refreshAccessToken()
    if (!refreshed.success)
      return initialResponse

    const replayedResponse = await request(refreshed.data.accessToken)
    if (isAuthRequired(replayedResponse))
      clearSession()

    return replayedResponse
  }

  async function login(input: AuthLoginInput): Promise<ApiEnvelope<AuthLoginData>> {
    const response = await requestApi('/auth/login', {
      method: 'POST',
      body: input,
      credentials: 'include',
    }, createResponseParser(authLoginEnvelopeSchema))
    if (response.success)
      storeAuthenticatedSession(response.data)

    return response
  }

  function register(input: AuthRegisterInput): Promise<ApiEnvelope<AuthRegisterData>> {
    return requestApi('/auth/register', {
      method: 'POST',
      body: input,
    }, createResponseParser(authRegisterEnvelopeSchema))
  }

  async function logout(): Promise<ApiEnvelope<AuthLogoutData>> {
    try {
      return await requestApi('/auth/logout', {
        method: 'POST',
        credentials: 'include',
      }, createResponseParser(authLogoutEnvelopeSchema))
    }
    finally {
      clearSession()
    }
  }

  async function restoreSession(): Promise<ApiEnvelope<AuthSessionData> | undefined> {
    if (!getAccessToken()) {
      if (import.meta.client && localStorage.getItem(legacyTokenStorageKey))
        clearSession()

      return undefined
    }

    const response = await requestWithAccessToken(accessToken => requestApi('/auth/session', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }, createResponseParser(authSessionEnvelopeSchema)))
    if (response.success)
      userStore.setUserInfo(response.data.principal)

    return response
  }

  async function updateMe(input: AuthUpdateMeInput): Promise<ApiEnvelope<AuthUpdateMeData>> {
    return requestWithAccessToken(accessToken => requestApi('/auth/me', {
      method: 'PATCH',
      body: input,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }, createResponseParser(authUpdateMeEnvelopeSchema)))
  }

  function legacyBearerRequest<T>(
    path: string,
    options: Omit<ApiRequestOptions, 'headers'>,
  ): Promise<LegacyEnvelope<T>> {
    return requestWithAccessToken(accessToken => requestJson(path, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }, parseLegacyMainResponse<T>))
  }

  /** main 代理的无鉴权请求（浏览器侧）：共享信封 schema 解析 + 泛型载荷。 */
  function mainRequest<T>(path: string, options: ApiRequestOptions): Promise<LegacyEnvelope<T>> {
    return requestJson(withQuery(path, options.query), options, parseLegacyMainResponse<T>)
  }

  return {
    clearSession,
    legacyBearerRequest,
    mainRequest,
    login,
    logout,
    register,
    restoreSession,
    updateMe,
  }
}
