import prisma from '~/lib/prisma'

async function getCategories() {
  const categories = await prisma.category.findMany()
  return categories
}

export default defineEventHandler(async () => {
  const categories = await getCategories()
  return categories
})
