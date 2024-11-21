import bcrypt from 'bcrypt'
import { z } from 'zod'
import prisma from '~/lib/prisma'
import { useZodVerify } from '~/server/composables/useZodVerify'

const verifySchema = z.object({
  username: z.string().min(1, { message: 'Username must not be empty' }).max(16, { message: 'Username must not exceed 16 characters' }),
  email: z.string().email({ message: 'Invalid email format' }),
  site: z.string().url({ message: 'Invalid site URL' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' }).max(32, { message: 'Password must not exceed 32 characters' }),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const { success, errorList, result } = useZodVerify(verifySchema, body)
  if (!success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid request body',
      data: errorList,
    })
  }

  const { username, email, site, password } = result

  const existingUsers = await prisma.user.findMany({
    where: {
      OR: [{ username }, { email }],
    },
  })
  if (existingUsers.length) {
    throw createError({
      statusCode: 409,
      statusMessage: 'User already exists',
    })
  }

  const salt = await bcrypt.genSalt(10)
  const hashedPassword = await bcrypt.hash(password, salt)

  await prisma.user.create({
    data: {
      username,
      email,
      site,
      password: hashedPassword,
    },
  })

  return 'User created successfully'
})
