import type { CommentPublic } from '@grey-flowers/contracts'
import { apiMutate } from '#server/utils/api-gateway'
import { formatDateTimeYmdHms } from '#shared/utils/date'

/** 认证自助读：仅看自己（不再接受 `?id=`，修复匿名可取任意用户数据的漏洞）。 */
export default formattedEventHandler(async (event) => {
  const messages = await apiMutate<CommentPublic[]>(
    'GET',
    '/public/users/me/messages',
    { event },
  )
  return {
    payload: messages.map(comment => ({
      ...comment,
      editedAt: formatDateTimeYmdHms(comment.editedAt),
      publishedAt: formatDateTimeYmdHms(comment.publishedAt),
    })),
  }
})
