import { z } from 'zod'
import prisma from '~/lib/prisma'
import { useZodVerify } from '~/server/composables/useZodVerify'

const verifySchema = z.object({
  content: z.string().min(1, { message: 'Content must not be empty' }).max(1024, { message: 'Content must not exceed 1024 characters' }),
})

export default formattedEventHandler(async (event) => {
  const id = event.context.jwtPayload.id
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

  const { content } = result

  const newItem = await prisma.message.create({
    data: {
      content,
      authorId: id,
    },
  })

  return { payload: { id: newItem.id } }
})
