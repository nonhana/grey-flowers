import prisma from '~/lib/prisma'

export default formattedEventHandler(async (event) => {
  const body = await readBody(event) as { receiverId: number, commentId: number }
  const { receiverId, commentId } = body
  await prisma.userMessage.create({ data: { receiverId, commentId } })
})
