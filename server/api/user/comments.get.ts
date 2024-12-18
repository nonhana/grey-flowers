import dayjs from 'dayjs'
import prisma from '~/lib/prisma'

async function getUserComments(userId: number) {
  const comments = await prisma.comment.findMany({
    where: { authorId: userId },
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
      children: {
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
        take: 2,
        orderBy: { publishedAt: 'asc' },
      },
    },
    take: 10,
    orderBy: { publishedAt: 'desc' },
  })
  const result = comments.map(comment => ({
    ...comment,
    publishedAt: dayjs(comment.publishedAt).format('YYYY-MM-DD HH:mm:ss'),
    editedAt: dayjs(comment.editedAt).format('YYYY-MM-DD HH:mm:ss'),
    children: comment.children.map(child => ({
      ...child,
      publishedAt: dayjs(child.publishedAt).format('YYYY-MM-DD HH:mm:ss'),
      editedAt: dayjs(child.editedAt).format('YYYY-MM-DD HH:mm:ss'),
    })),
  }))
  return result
}

export default formattedEventHandler(async (event) => {
  const query = getQuery(event) as { id: string }
  const userId = Number.parseInt(query.id)
  const comments = await getUserComments(userId)
  return { payload: comments }
})
