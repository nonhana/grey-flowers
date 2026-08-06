import type { CommentPublicTree } from '@grey-flowers/contracts'
import type { CommentListQuery } from '#shared/types/comments'
import { apiGet } from '#server/utils/api-gateway'
import { formatDateTimeYmdHms } from '#shared/utils/date'

function localizeTimes(comment: CommentPublicTree): CommentPublicTree {
  return {
    ...comment,
    editedAt: formatDateTimeYmdHms(comment.editedAt),
    publishedAt: formatDateTimeYmdHms(comment.publishedAt),
    children: comment.children.map(child => ({
      ...child,
      editedAt: formatDateTimeYmdHms(child.editedAt),
      publishedAt: formatDateTimeYmdHms(child.publishedAt),
    })),
  }
}

export default formattedEventHandler(async (event) => {
  const query = getQuery(event) as CommentListQuery
  const path = query.path as string
  if (!path) {
    return {
      statusCode: 400,
      statusMessage: 'Invalid path',
      success: false,
    }
  }

  const page = Number.parseInt(String(query.page ?? '1'), 10) || 1
  const pageSize = Number.parseInt(String(query.pageSize ?? '10'), 10) || 10

  const comments = await apiGet<CommentPublicTree[]>('/public/comments/list', {
    path,
    page,
    pageSize,
  })

  return { payload: comments.map(localizeTimes) }
})
