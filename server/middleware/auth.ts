import jwt from 'jsonwebtoken'
import env from '~/server/env/dotenv'
import { blackList } from '~/server/utils/blackList'

export default eventHandler((event) => {
  if (!blackList.includes(event.path)) {
    return
  }

  const token = event.headers.get('Authorization')?.split(' ')[1] // Bearer <token>
  if (!token) {
    return {
      statusCode: 401,
      statusMessage: 'Unauthorized',
      success: false,
    }
  }

  try {
    const decoded = jwt.verify(token, env.HANA_JWT_SECRET!)
    event.context.jwtPayload = decoded
  }
  catch {
    return {
      statusCode: 401,
      statusMessage: 'Invalid token',
      success: false,
    }
  }
})
