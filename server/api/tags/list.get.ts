import prisma from '#server/utils/prisma'

async function getTags() {
  const tags = await prisma.tag.findMany()
  return tags.map(({ name, articleCount }) => ({ name, count: articleCount }))
}

export default formattedEventHandler(async () => {
  const tags = await getTags()
  return { payload: tags }
})
