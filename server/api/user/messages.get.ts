import dayjs from 'dayjs'
import prisma from '~/lib/prisma'
import { commentSelectObj } from '~/server/utils/prismaShortcut'

async function getUserMessages(userId: number) {
  const messages = await prisma.userMessage.findMany({
    where: { receiverId: userId },
    select: {
      comment: { select: commentSelectObj },
    },
    take: 10,
    orderBy: { comment: { publishedAt: 'desc' } },
  })
  const result = messages.map(message => ({
    ...message.comment,
    publishedAt: dayjs(message.comment.publishedAt).format('YYYY-MM-DD HH:mm:ss'),
    editedAt: dayjs(message.comment.editedAt).format('YYYY-MM-DD HH:mm:ss'),
  }))
  return result
}

export default formattedEventHandler(async (event) => {
  const query = getQuery(event) as { id: string }
  const userId = Number.parseInt(query.id)
  const messages = await getUserMessages(userId)
  return { payload: messages }
})
