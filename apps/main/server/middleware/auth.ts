import { authSessionResponseSchema } from '@grey-flowers/contracts'

export default eventHandler(async (event) => {
  if (!blackList.includes(event.path)) {
    return
  }

  const token = event.headers.get('Authorization')?.match(/^Bearer (\S+)$/)?.[1]
  if (!token) {
    return {
      statusCode: 401,
      statusMessage: 'Unauthorized, please login',
      success: false,
    }
  }

  const apiOrigin = useRuntimeConfig(event).public.apiOrigin.replace(/\/$/, '')
  try {
    const response = await $fetch.raw(`${apiOrigin}/auth/session`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      ignoreResponseError: true,
    })
    const parsed = authSessionResponseSchema.safeParse(response._data)
    if (parsed.success) {
      event.context.principal = parsed.data.data.principal
      return
    }
  }
  catch {
    // The legacy endpoint keeps its existing authentication failure envelope.
  }

  return {
    statusCode: 401,
    statusMessage: 'Invalid token, please login',
    success: false,
  }
})
