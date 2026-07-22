import { sendCommentReplyMail } from '#server/utils/mailer'
import prisma from '#server/utils/prisma'
import { seoData } from '#shared/data/meta'

export default formattedEventHandler(async (event) => {
  const body = await readBody(event) as { receiverId: number, commentId: number }
  const { receiverId, commentId } = body
  await prisma.userMessage.create({ data: { receiverId, commentId } })

  const [receiver, comment] = await Promise.all([
    prisma.user.findUnique({ where: { id: receiverId }, select: { email: true, username: true } }),
    prisma.comment.findUnique({
      where: { id: commentId },
      select: {
        content: true,
        path: true,
        author: { select: { username: true } },
        parent: { select: { content: true } },
        replyToComment: { select: { content: true } },
      },
    }),
  ])

  if (receiver?.email && comment) {
    await sendCommentReplyMail({
      receiverEmail: receiver.email,
      receiverName: receiver.username,
      replierName: comment.author.username,
      commentContent: comment.content,
      repliedContent: comment.replyToComment?.content || comment.parent?.content || undefined,
      pagePath: comment.path,
      siteUrl: seoData.mySite,
    })
  }
})
