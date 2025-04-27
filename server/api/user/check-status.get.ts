import jwt from 'jsonwebtoken'
import env from '~/server/env/dotenv'

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
    jwt.verify(token, env.HANA_JWT_SECRET!)
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
