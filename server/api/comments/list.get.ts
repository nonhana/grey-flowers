import type { CommentListQuery } from '#shared/types/comments'
import prisma from '#server/utils/prisma'

async function getComments(path: string, page: number, pageSize: number) {
  const comments = await prisma.comment.findMany({
    where: { path, level: 'PARENT' },
    select: {
      ...commentSelectObj,
      children: { select: { ...commentSelectObj }, orderBy: { publishedAt: 'asc' } },
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: { publishedAt: 'desc' },
  })
  return comments.map(comment => serializeParentComment(comment))
}

export default formattedEventHandler(async (event) => {
  const query = getQuery(event) as CommentListQuery
  const page = Number.parseInt(query.page as string) || 1
  const pageSize = Number.parseInt(query.pageSize as string) || 6
  const path = query.path as string
  const comments = await getComments(path, page, pageSize)
  return { payload: comments }
})
