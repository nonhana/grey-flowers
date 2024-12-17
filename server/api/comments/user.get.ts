import dayjs from 'dayjs'
import prisma from '~/lib/prisma'
import { selectCommentObj } from '~/server/prisma/select'

async function getUserComments(userId: number) {
  const comments = await prisma.comment.findMany({
    where: { authorId: userId },
    select: {
      ...selectCommentObj,
      parent: { select: { content: true } },
      children: {
        select: selectCommentObj,
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
