import prisma from '~/lib/prisma'

async function getDates(): Promise<Record<string, string[]>> {
  const articles = await prisma.article.findMany({
    select: { publishedAt: true },
  })
  const dateMap = new Map<string, Set<string>>()
  articles.forEach((article) => {
    const year = article.publishedAt.getFullYear().toString()
    const month = (article.publishedAt.getMonth() + 1).toString().padStart(2, '0')
    if (!dateMap.has(year)) {
      dateMap.set(year, new Set())
    }
    dateMap.get(year)!.add(month)
  })
  const result: Record<string, string[]> = {}
  dateMap.forEach((monthsSet, year) => {
    result[year] = Array.from(monthsSet)
  })
  return result
}

export default formattedEventHandler(async () => {
  const dates = await getDates()
  return { payload: dates }
})
