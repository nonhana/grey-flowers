import prisma from '~/lib/prisma'

export default formattedEventHandler(async (event) => {
  const query = getQuery(event)
  const { articlePath } = query

  const targetArticle = await prisma.article.findUnique({ where: { to: articlePath as string }, select: { id: true } })
  if (!targetArticle) {
    return {
      statusCode: 404,
      statusMessage: `Article not found by path: ${articlePath}`,
      success: false,
    }
  }

  const totalCount = await prisma.comment.count({ where: { articleId: targetArticle.id } })
  const parentCount = await prisma.comment.count({ where: { articleId: targetArticle.id, level: 'PARENT' } })

  return { payload: { totalCount, parentCount } }
})
