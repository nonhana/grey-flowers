import dayjs from 'dayjs'
import prisma from '~/lib/prisma'

async function selectSingleMessage(id: number) {
  const message = await prisma.message.findUnique({
    where: { id },
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

  return message
}

export default formattedEventHandler(async (event) => {
  const query = getQuery(event) as { id: string }
  const id = Number.parseInt(query.id)
  const message = await selectSingleMessage(id)
  if (!message) {
    return {
      statusCode: 404,
      statusMessage: 'Message not found',
      success: false,
    }
  }
  const result = {
    ...message,
    publishedAt: dayjs(message.publishedAt).format('YYYY-MM-DD HH:mm:ss'),
    editedAt: dayjs(message.editedAt).format('YYYY-MM-DD HH:mm:ss'),
  }
  return { payload: result }
})
