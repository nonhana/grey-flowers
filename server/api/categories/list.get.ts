import prisma from '#server/utils/prisma'

async function getCategories() {
  const categories = await prisma.category.findMany()
  return categories
}

export default formattedEventHandler(async () => {
  const categories = await getCategories()
  return { payload: categories }
})
