import type { CommentListQuery } from '~/server/types/comments'
import dayjs from 'dayjs'
import prisma from '~/lib/prisma'

async function getComments(path: string, page: number, pageSize: number) {
  const comments = await prisma.comment.findMany({
    where: { path, level: 'PARENT' },
    // TODO: 这里的 select object 单独提出来会导致 TS 的类型检查失效，什么逆天
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
      children: { select: {
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
      }, orderBy: { publishedAt: 'asc' } },
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
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
  const query = getQuery(event) as CommentListQuery
  const page = Number.parseInt(query.page as string) || 1
  const pageSize = Number.parseInt(query.pageSize as string) || 6
  const path = query.path as string
  const comments = await getComments(path, page, pageSize)
  return { payload: comments }
})
