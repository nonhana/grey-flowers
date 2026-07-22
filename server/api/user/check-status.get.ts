import { jwtVerify } from 'jose'
import env from '#server/env'

// 未登录、登录正常用户放行，登录过期用户返回401
export default formattedEventHandler(async (event) => {
  const token = event.headers.get('Authorization')?.split(' ')[1] // Bearer <token>
  if (!token) {
    return {
      statusCode: 200,
      success: true,
    }
  }

  try {
    const joseSecret = new TextEncoder().encode(env.HANA_JWT_SECRET)
    await jwtVerify(token, joseSecret)
    return {
      statusCode: 200,
      success: true,
    }
  }
  catch {
    return {
      statusCode: 401,
      statusMessage: '登录已过期，请重新登录',
      success: false,
    }
  }
})
