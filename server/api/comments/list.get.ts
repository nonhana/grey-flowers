import type * as p from '@prisma/client'
import dayjs from 'dayjs'
import prisma from '~/lib/prisma'
import { selectCommentObj } from '~/server/prisma/select'
import type { CommentListQuery } from '~/server/types/comments'
import { formattedEventHandler } from '~/server/utils/formattedEventHandler'

async function getComments(articleId: number, page: number, pageSize: number) {
  const comments = await prisma.comment.findMany({
    where: { articleId, level: 'PARENT' },
    select: { ...selectCommentObj, children: { select: selectCommentObj, orderBy: { publishedAt: 'asc' } } },
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
  const articlePath = query.articlePath as string
  const targetArticle = await prisma.article.findUnique({ where: { to: articlePath as string }, select: { id: true } })
  if (!targetArticle) {
    return {
      statusCode: 404,
      statusMessage: `Article not found by path: ${articlePath}`,
      success: false,
    }
  }

  const comments = await getComments(targetArticle.id, page, pageSize)
  return { payload: comments }
})
