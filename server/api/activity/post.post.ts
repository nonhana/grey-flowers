import dayjs from 'dayjs'
import { z } from 'zod'
import prisma from '~/lib/prisma'
import { useZodVerify } from '~/server/composables/useZodVerify'

const verifySchema = z.object({
  title: z.string().min(1, { message: 'Title must not be empty' }).max(128, { message: 'Title must not exceed 128 characters' }),
  content: z.string().min(1, { message: 'Content must not be empty' }).max(2048, { message: 'Content must not exceed 2048 characters' }),
  images: z.array(z.string()).max(4, { message: 'Images must not exceed 10' }).optional(),
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

  const { title, content, images } = result

  const newItem = await prisma.activity.create({
    data: {
      title,
      content,
      images,
    },
    select: {
      id: true,
      title: true,
      content: true,
      images: true,
      publishedAt: true,
      editedAt: true,
    },
  })

  const formattedItem = {
    ...newItem!,
    commentCount: 0,
    publishedAt: dayjs(newItem!.publishedAt).format('YYYY-MM-DD HH:mm:ss'),
    editedAt: dayjs(newItem!.editedAt).format('YYYY-MM-DD HH:mm:ss'),
  }

  return { payload: formattedItem }
})
