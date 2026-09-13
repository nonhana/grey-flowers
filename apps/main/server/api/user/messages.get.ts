import { commentPublicSchema } from '@grey-flowers/contracts'
import { z } from 'zod'

/** 认证自助读：仅看自己（不再接受 `?id=`，修复匿名可取任意用户数据的漏洞）。 */
export default formattedEventHandler(async (event) => {
  const messages = await apiMutate(
    'GET',
    '/public/users/me/messages',
    { event },
    z.array(commentPublicSchema),
  )
  return {
    payload: messages.map(comment => ({
      ...comment,
      editedAt: formatDateTimeYmdHms(comment.editedAt),
      publishedAt: formatDateTimeYmdHms(comment.publishedAt),
    })),
  }
})
