import prisma from '~/lib/prisma'

export default formattedEventHandler(async (event) => {
  const id = event.context.jwtPayload.id
  const body = await readBody(event)
  const { commentId } = body

  const comment = await prisma.comment.findUnique({ where: { id: commentId } })

  if (!comment) {
    return {
      statusCode: 404,
      statusMessage: 'Comment not found',
      success: false,
    }
  }

  if (comment.authorId !== id) {
    return {
      statusCode: 403,
      statusMessage: 'Unauthorized',
      success: false,
    }
  }

  await prisma.comment.delete({ where: { id: commentId } })
})
