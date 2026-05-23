import prisma from '~/lib/prisma'
import { formatDateTimeYmdHms } from '~/utils/date'

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
    publishedAt: formatDateTimeYmdHms(message.publishedAt),
    editedAt: formatDateTimeYmdHms(message.editedAt),
  }))

  return { payload: result }
})
