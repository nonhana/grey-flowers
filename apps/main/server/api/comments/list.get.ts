import type { CommentPublicTree } from '@grey-flowers/contracts'
import { commentPublicListQuerySchema, commentPublicTreeSchema } from '@grey-flowers/contracts'
import { z } from 'zod'

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
  const query = getQuery(event)
  const parsed = parsePublicQuery(commentPublicListQuerySchema, {
    path: query.path,
    page: query.page,
    pageSize: query.pageSize,
  })

  const comments = await apiGet('/public/comments/list', {
    path: parsed.path,
    page: parsed.page,
    pageSize: parsed.pageSize,
  }, z.array(commentPublicTreeSchema))

  return { payload: comments.map(localizeTimes) }
})
