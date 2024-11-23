import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import prisma from '~/lib/prisma'
import env from '~/server/env/dotenv'
import type { JwtPayload } from '~/server/types/jwt'
import { formattedEventHandler } from '~/server/utils/formattedEventHandler'

export default formattedEventHandler(async (event) => {
  const body = await readBody(event)
  const { account, password } = body

  const isEmail = z.string().email().safeParse(account).success

  const user = await prisma.user.findUnique({
    where: isEmail ? { email: account } : { username: account },
  })
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'User not found, please sign up',
    })
  }

  const isValid = await bcrypt.compare(password, user.password)
  if (!isValid) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Incorrect password',
    })
  }

  const userInfo: JwtPayload = {
    id: user.id,
    email: user.email,
    username: user.username,
    avatar: user.avatar,
    site: user.site,
  }

  const token = jwt.sign(userInfo, env.HANA_JWT_SECRET!, {
    expiresIn: '30d',
  })

  return { payload: { token, userInfo } }
})
