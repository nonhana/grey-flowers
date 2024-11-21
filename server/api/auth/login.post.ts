import bcrypt from 'bcrypt'
import { z } from 'zod'
import prisma from '~/lib/prisma'

export default defineEventHandler(async (event) => {
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

  const session = event.context.session
  session.user = {
    id: user.id,
    email: user.email,
    username: user.username,
    avatar: user.avatar,
    site: user.site,
  }

  return 'Login successful'
})
