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
import {
  apiEnvelopeSchema,
  authLoginDataSchema,
  authLogoutDataSchema,
  authRefreshDataSchema,
  authRegisterDataSchema,
  authSessionDataSchema,
  authUpdateMeDataSchema,
} from '@grey-flowers/contracts'
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
}

type ResponseParser<T> = (value: unknown) => T

export interface LegacyMainResponse<T> {
  error: unknown
  payload: T | null
  statusCode: number
  statusMessage: string
  success: boolean
}

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

function parseLegacyMainResponse<T>(value: unknown): LegacyMainResponse<T> {
  if (
    !isRecord(value)
    || typeof value.success !== 'boolean'
    || typeof value.statusCode !== 'number'
    || typeof value.statusMessage !== 'string'
  ) {
    throw new Error('主站接口返回了无效响应。')
  }

  return value as unknown as LegacyMainResponse<T>
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
  ): Promise<LegacyMainResponse<T>> {
    return requestWithAccessToken(accessToken => requestJson(path, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }, parseLegacyMainResponse<T>))
  }

  return {
    clearSession,
    legacyBearerRequest,
    login,
    logout,
    register,
    restoreSession,
    updateMe,
  }
}
