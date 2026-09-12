import type { CommentPublicTree } from '@grey-flowers/contracts'
import { commentPublicTreeSchema } from '@grey-flowers/contracts'
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

/** 认证自助读：仅看自己（不再接受 `?id=`，修复匿名可取任意用户数据的漏洞）。 */
export default formattedEventHandler(async (event) => {
  const comments = await apiMutate(
    'GET',
    '/public/users/me/comments',
    { event },
    z.array(commentPublicTreeSchema),
  )
  return { payload: comments.map(localizeTimes) }
})
