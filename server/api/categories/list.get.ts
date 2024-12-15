import prisma from '~/lib/prisma'

async function getCategories() {
  const categories = await prisma.category.findMany()
  return categories
}

export default formattedEventHandler(async () => {
  const categories = await getCategories()
  return { payload: categories }
})
