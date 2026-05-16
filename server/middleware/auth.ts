import { jwtVerify } from 'jose'
import env from '~/server/env'

export default eventHandler(async (event) => {
  if (!blackList.includes(event.path)) {
    return
  }

  const token = event.headers.get('Authorization')?.split(' ')[1] // Bearer <token>
  if (!token) {
    return {
      statusCode: 401,
      statusMessage: 'Unauthorized, please login',
      success: false,
    }
  }

  try {
    const joseSecret = new TextEncoder().encode(env.HANA_JWT_SECRET)
    const { payload: decoded } = await jwtVerify(token, joseSecret)
    event.context.jwtPayload = decoded
  }
  catch {
    return {
      statusCode: 401,
      statusMessage: 'Invalid token, please login',
      success: false,
    }
  }
})
