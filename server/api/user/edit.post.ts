import type { Prisma } from '@prisma/client'
import bcrypt from 'bcrypt'
import { z } from 'zod'
import prisma from '~/lib/prisma'
import { useZodVerify } from '~/server/composables/useZodVerify'

const verifySchema = z.object({
  id: z.string().transform(Number),
  username: z.string().min(1, { message: 'Username must not be empty' }).max(16, { message: 'Username must not exceed 16 characters' }).optional(),
  email: z.email({ message: 'Invalid email format' }).optional(),
  site: z.url({ message: 'Invalid site URL' }).optional().nullable(),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' }).max(32, { message: 'Password must not exceed 32 characters' }).optional(),
})

export default formattedEventHandler(async (event) => {
  const body = await readBody(event)

  const { success, errorList, result } = useZodVerify(verifySchema, body)
  if (!success) {
    return {
      statusCode: 400,
      statusMessage: 'Invalid request body',
      error: errorList,
      success: false,
    }
  }

  const { id, username, email, site, password } = result

  const updateObj: Prisma.UserUpdateInput = {}
  if (username !== undefined) {
    updateObj.username = username
  }
  if (email !== undefined) {
    updateObj.email = email
  }
  if (site !== undefined) {
    updateObj.site = site
  }
  if (password) {
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)
    updateObj.password = hashedPassword
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateObj,
    select: {
      id: true,
      username: true,
      email: true,
      site: true,
      avatar: true,
    },
  })

  return { payload: user }
})
