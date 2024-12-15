import dayjs from 'dayjs'
import prisma from '~/lib/prisma'

export default formattedEventHandler(async () => {
  const messages = await prisma.message.findMany({
    select: {
      id: true,
      parent: {
        select: {
          id: true,
          content: true,
        },
      },
      author: {
        select: {
          id: true,
          username: true,
          site: true,
          avatar: true,
        },
      },
      content: true,
      publishedAt: true,
      editedAt: true,
    },
  })

  const result = messages.map(message => ({
    ...message,
    publishedAt: dayjs(message.publishedAt).format('YYYY-MM-DD HH:mm:ss'),
    editedAt: dayjs(message.editedAt).format('YYYY-MM-DD HH:mm:ss'),
  }))

  return { payload: result }
})
