import { z } from 'zod'
import prisma from '~/lib/prisma'
import { Prisma } from '~/prisma/generated/client'
import { useZodVerify } from '~/server/composables/useZodVerify'

const verifySchema = z.object({
  path: z.string(),
  content: z.string().min(1, { message: 'Content must not be empty' }).max(2048, { message: 'Content must not exceed 2048 characters' }),
  parentId: z.number().int().optional(),
  replyToUserId: z.number().int().optional(),
  replyToCommentId: z.number().int().optional(),
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

  const { path, content, parentId, replyToUserId, replyToCommentId } = result

  let contentMarkdown: Prisma.InputJsonValue | typeof Prisma.JsonNull = Prisma.JsonNull

  const parsedRes = await parseCommentMarkdown(content)

  if (parsedRes.success) {
    contentMarkdown = parsedRes.payload as unknown as Prisma.InputJsonValue

    const newItem = await prisma.comment.create({
      data: {
        path,
        content,
        contentMarkdown,
        level: parentId ? 'CHILD' : 'PARENT',
        parentId,
        authorId: id,
        replyToUserId,
        replyToCommentId,
      },
      select: commentSelectObj,
    })

    const formattedItem = serializeChildComment(newItem!)

    return { payload: formattedItem }
  }
  else {
    const { statusCode, statusMessage } = parsedRes

    return {
      success: false,
      statusCode,
      statusMessage,
    }
  }
})
