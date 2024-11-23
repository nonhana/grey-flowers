import type { ParsedContent } from '@nuxt/content'
import type * as p from '@prisma/client'
import prisma from '~/lib/prisma'
import { formattedEventHandler } from '~/server/utils/formattedEventHandler'
import { flatStr } from '~/utils/handleStr'

// 从 Nuxt Content 中获取文章数据
async function getNuxtContent() {
  const _params = { without: ['body'] }

  const queryString = new URLSearchParams({
    _params: JSON.stringify(_params),
  }).toString()

  const url = `/api/_content/query?${queryString}`

  const result = await $fetch(url) as ParsedContent[]
  return result
}

// 处理 tag 数据，返回 tagName 和 tagId 的映射
async function handleTags(articles: ParsedContent[]): Promise<Record<string, number>> {
  // 统计所有文章的 tag
  const tagMap = new Map<string, number>()
  articles.forEach(({ tags }) => {
    tags.forEach((tag: string) => {
      tagMap.set(tag, (tagMap.get(tag) || 0) + 1)
    })
  })

  const tagNames = Array.from(tagMap.keys())

  const existingTags = await prisma.tag.findMany({
    where: { name: { in: tagNames } },
    select: { id: true, name: true, articleCount: true },
  })

  const existingTagNames = new Set(existingTags.map(tag => tag.name))
  const newTagNames = tagNames.filter(tagName => !existingTagNames.has(tagName))

  const updateTags = existingTags.map(tag => ({
    where: { name: tag.name },
    data: { articleCount: tagMap.get(tag.name) || tag.articleCount || 0 },
  }))

  const newTags = newTagNames.map(name => ({
    name,
    articleCount: tagMap.get(name) || 0,
  }))

  await prisma.$transaction([
    ...updateTags.map(update => prisma.tag.update(update)),
    prisma.tag.createMany({ data: newTags }),
  ])

  const updatedTags = await prisma.tag.findMany({
    where: { name: { in: tagNames } },
    select: { id: true, name: true },
  })

  return updatedTags.reduce((acc, tag) => {
    acc[tag.name] = tag.id
    return acc
  }, {} as Record<string, number>)
}

// 处理 category 数据，返回 categoryName 和 categoryId 的映射
async function handleCategories(articles: ParsedContent[]): Promise<Record<string, number>> {
  const categoryMap = new Map<string, number>()
  articles.forEach(({ category }) => {
    categoryMap.set(category, (categoryMap.get(category) || 0) + 1)
  })

  const categoryNames = Array.from(categoryMap.keys())

  const existingCategories = await prisma.category.findMany({
    where: { name: { in: categoryNames } },
  })

  const existingCategoryNames = new Set(existingCategories.map(category => category.name))
  const newCategoryNames = categoryNames.filter(categoryName => !existingCategoryNames.has(categoryName))

  const updateCategories = existingCategories.map(category => ({
    where: { name: category.name },
    data: {
      articleCount: categoryMap.get(category.name) || category.articleCount || 0,
      cover: category.cover || `/categories/${flatStr(category.name)}.webp`,
    },
  }))

  const newCategories = newCategoryNames.map(name => ({
    name,
    articleCount: categoryMap.get(name) || 0,
    cover: `/categories/${flatStr(name)}.webp`,
  }))

  await prisma.$transaction([
    ...updateCategories.map(update => prisma.category.update(update)),
    prisma.category.createMany({ data: newCategories }),
  ])

  const updatedCategories = await prisma.category.findMany({
    where: { name: { in: categoryNames } },
    select: { id: true, name: true },
  })

  return updatedCategories.reduce((acc, category) => {
    acc[category.name] = category.id
    return acc
  }, {} as Record<string, number>)
}

// 处理 article 数据
async function handleArticles(articles: ParsedContent[]) {
  // 获取 tags 和 categories 的映射
  const tagMap = await handleTags(articles) // name -> id
  const categoryMap = await handleCategories(articles) // name -> id

  // 查询已有文章的 title
  const existingArticles = await prisma.article.findMany({
    select: { title: true, id: true },
  })
  const existingTitles = new Set(existingArticles.map(article => article.title))
  const existingArticleMap = Object.fromEntries(existingArticles.map(article => [article.title, article.id]))

  // 分类文章为新增和更新
  const { createArticles, updateArticles } = articles.reduce(
    (acc, article) => {
      const baseData = {
        to: article._path!,
        title: article.title!,
        description: article.description,
        cover: article.cover,
        alt: article.alt,
        ogImage: article.ogImage,
        publishedAt: new Date(article.publishedAt),
        editedAt: new Date(article.editedAt),
        published: article.published,
        wordCount: article.wordCount,
        // 关联 tags 和 category
        tags: {
          connect: article.tags.map((tag: string) => ({ id: tagMap[tag] })),
        },
        category: { connect: { id: categoryMap[article.category] } },
      }

      if (existingTitles.has(article.title!)) {
        acc.updateArticles.push({ ...baseData, id: existingArticleMap[article.title!] })
      }
      else {
        acc.createArticles.push({ ...baseData, title: article.title! })
      }

      return acc
    },
    { createArticles: [], updateArticles: [] } as {
      createArticles: p.Prisma.ArticleCreateInput[]
      updateArticles: Array<p.Prisma.ArticleUpdateInput & { id: number }>
    },
  )

  // 使用事务批量操作
  await prisma.$transaction([
    // 批量新增文章
    ...createArticles.map(article =>
      prisma.article.create({ data: article }),
    ),
    // 批量更新文章
    ...updateArticles.map(({ id, ...data }) =>
      prisma.article.update({ where: { id }, data }),
    ),
  ])
}

export default formattedEventHandler(async () => {
  const articles = await getNuxtContent()
  await handleArticles(articles)
})
