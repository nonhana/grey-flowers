import prisma from '~/lib/prisma'

export default formattedEventHandler(async (event) => {
  const query = getQuery(event)
  const path = query.path as string

  const totalCount = await prisma.comment.count({ where: { path } })
  const parentCount = await prisma.comment.count({ where: { path, level: 'PARENT' } })

  return { payload: { totalCount, parentCount } }
})
