import type { JwtPayload } from '#shared/types/jwt'
import bcrypt from 'bcryptjs'
import { SignJWT } from 'jose'
import { z } from 'zod'
import env from '#server/env'
import prisma from '#server/utils/prisma'

export default formattedEventHandler(async (event) => {
  const body = await readBody(event)
  const { account, password } = body

  const isEmail = z.email().safeParse(account).success

  const user = await prisma.user.findUnique({
    where: isEmail ? { email: account } : { username: account },
  })
  if (!user) {
    return {
      statusCode: 401,
      statusMessage: 'User not found, please sign up',
      success: false,
    }
  }

  const isValid = await bcrypt.compare(password, user.password)
  if (!isValid) {
    return {
      statusCode: 401,
      statusMessage: 'Incorrect password',
      success: false,
    }
  }

  const userInfo = {
    id: user.id,
    email: user.email,
    username: user.username,
    avatar: user.avatar,
    site: user.site,
  } satisfies JwtPayload

  const joseSecret = new TextEncoder().encode(env.HANA_JWT_SECRET)

  const token = await new SignJWT(userInfo)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(joseSecret)

  return { payload: { token, userInfo } }
})
