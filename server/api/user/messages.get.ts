import dayjs from 'dayjs'
import prisma from '~/lib/prisma'

async function getUserMessages(userId: number) {
  const messages = await prisma.userMessage.findMany({
    where: { receiverId: userId },
    select: {
      comment: {
        select: {
          id: true,
          path: true,
          content: true,
          level: true,
          author: { select: { id: true, username: true, site: true, avatar: true } },
          parent: { select: { id: true, content: true, author: { select: { id: true, username: true, site: true, avatar: true } } } },
          replyToUser: { select: { id: true, username: true } },
          replyToComment: { select: { id: true, content: true } },
          publishedAt: true,
          editedAt: true,
        },
      },
    },
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
