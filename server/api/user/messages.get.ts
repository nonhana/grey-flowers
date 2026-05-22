import prisma from '~/lib/prisma'

async function getUserMessages(userId: number) {
  const messages = await prisma.userMessage.findMany({
    where: { receiverId: userId },
    select: {
      comment: { select: commentSelectObj },
    },
    take: 10,
    orderBy: { comment: { publishedAt: 'desc' } },
  })
  return messages.map(message => serializeChildComment(message.comment))
}

export default formattedEventHandler(async (event) => {
  const query = getQuery(event) as { id: string }
  const userId = Number.parseInt(query.id)
  const messages = await getUserMessages(userId)
  return { payload: messages }
})
