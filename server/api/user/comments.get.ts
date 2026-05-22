import prisma from '~/lib/prisma'

async function getUserComments(userId: number) {
  const comments = await prisma.comment.findMany({
    where: { authorId: userId },
    select: {
      ...commentSelectObj,
      children: {
        select: { ...commentSelectObj },
        take: 2,
        orderBy: { publishedAt: 'asc' },
      },
    },
    take: 10,
    orderBy: { publishedAt: 'desc' },
  })
  return comments.map(comment => serializeParentComment(comment))
}

export default formattedEventHandler(async (event) => {
  const query = getQuery(event) as { id: string }
  const userId = Number.parseInt(query.id)
  const comments = await getUserComments(userId)
  return { payload: comments }
})
