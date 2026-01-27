import type { ContentCollectionItem } from '@nuxt/content'
import type { ArticleCreateInput, ArticleUpdateInput } from '~/prisma/generated/models'
import { queryCollection } from '@nuxt/content/server'
import prisma from '~/lib/prisma'
import { flatStr } from '~/utils/handleStr'

const fieldsCreator = <T extends (keyof ContentCollectionItem)[]>(...fields: T): T => fields

const ARTICLE_FIELDS = fieldsCreator(
  'title',
  'path',
  'description',
  'cover',
  'tags',
  'category',
  'publishedAt',
  'alt',
  'ogImage',
  'published',
  'wordCount',
  'editedAt',
)

type DatabaseArticleType = Pick<
  ContentCollectionItem,
  typeof ARTICLE_FIELDS[number]
>

const titleBlacklist = ['About', 'Friends']

// 处理 tag 数据，返回 tagName 和 tagId 的映射
async function handleTags(articles: DatabaseArticleType[]): Promise<Record<string, number>> {
  // 统计所有文章的 tag
  const tagMap = new Map<string, number>()
  articles.forEach(({ tags }) => {
    tags.forEach((tag: string) => {
      tagMap.set(tag, (tagMap.get(tag) || 0) + 1)
    })
  })

  const tagNames = Array.from(tagMap.keys())
  if (tagNames.length === 0)
    return {}

  // 使用 upsert 一次性处理创建和更新，避免 查询→判断→更新 的模式
  const upsertResults = await Promise.all(
    tagNames.map(name =>
      prisma.tag.upsert({
        where: { name },
        create: { name, articleCount: tagMap.get(name) || 0 },
        update: { articleCount: tagMap.get(name) || 0 },
        select: { id: true, name: true },
      }),
    ),
  )

  return Object.fromEntries(upsertResults.map(tag => [tag.name, tag.id]))
}

// 处理 category 数据，返回 categoryName 和 categoryId 的映射
async function handleCategories(articles: DatabaseArticleType[]): Promise<Record<string, number>> {
  const categoryMap = new Map<string, number>()
  articles.forEach(({ category }) => {
    categoryMap.set(category, (categoryMap.get(category) || 0) + 1)
  })

  const categoryNames = Array.from(categoryMap.keys())
  if (categoryNames.length === 0)
    return {}

  // 先查询已存在的分类，获取它们的 cover（避免覆盖已有的 cover）
  const existingCategories = await prisma.category.findMany({
    where: { name: { in: categoryNames } },
    select: { name: true, cover: true },
  })
  const existingCoverMap = new Map(existingCategories.map(c => [c.name, c.cover]))

  // 使用 upsert 一次性处理创建和更新
  const upsertResults = await Promise.all(
    categoryNames.map((name) => {
      const existingCover = existingCoverMap.get(name)
      return prisma.category.upsert({
        where: { name },
        create: {
          name,
          articleCount: categoryMap.get(name) || 0,
          cover: `/categories/${flatStr(name)}.webp`,
        },
        update: {
          articleCount: categoryMap.get(name) || 0,
          // 只有当 cover 不存在时才设置默认值
          ...(existingCover ? {} : { cover: `/categories/${flatStr(name)}.webp` }),
        },
        select: { id: true, name: true },
      })
    }),
  )

  return Object.fromEntries(upsertResults.map(category => [category.name, category.id]))
}

// 处理 article 数据
async function handleArticles(articles: DatabaseArticleType[]) {
  // 优化1：并行处理 tags 和 categories，同时查询已有文章
  const [tagMap, categoryMap, existingArticles] = await Promise.all([
    handleTags(articles),
    handleCategories(articles),
    prisma.article.findMany({ select: { title: true, id: true } }),
  ])

  const existingTitles = new Set(existingArticles.map(article => article.title))
  const existingArticleMap = Object.fromEntries(
    existingArticles.map(article => [article.title, article.id]),
  )

  // 分类文章为新增和更新
  const createArticles: ArticleCreateInput[] = []
  const updateArticles: Array<ArticleUpdateInput & { id: number }> = []

  for (const article of articles) {
    const tagIds = article.tags.map((tag: string) => ({ id: tagMap[tag] }))

    if (existingTitles.has(article.title!)) {
      // 更新文章：使用 set 替代 connect，自动处理关联的增删
      updateArticles.push({
        id: existingArticleMap[article.title!]!,
        to: article.path!,
        title: article.title!,
        description: article.description,
        cover: article.cover,
        alt: article.alt,
        ogImage: article.ogImage,
        publishedAt: new Date(article.publishedAt),
        editedAt: new Date(article.editedAt),
        published: article.published,
        wordCount: article.wordCount,
        tags: { set: tagIds },
        category: { connect: { id: categoryMap[article.category] } },
      })
    }
    else {
      // 新增文章
      createArticles.push({
        to: article.path!,
        title: article.title!,
        description: article.description,
        cover: article.cover,
        alt: article.alt,
        ogImage: article.ogImage,
        publishedAt: new Date(article.publishedAt),
        editedAt: new Date(article.editedAt),
        published: article.published,
        wordCount: article.wordCount,
        tags: { connect: tagIds },
        category: { connect: { id: categoryMap[article.category] } },
      })
    }
  }

  // 优化2：使用事务批量操作，并行执行所有操作
  await prisma.$transaction(
    async (tx) => {
      await Promise.all([
        // 批量新增文章
        ...createArticles.map(article => tx.article.create({ data: article })),
        // 批量更新文章
        ...updateArticles.map(({ id, ...data }) =>
          tx.article.update({ where: { id }, data }),
        ),
      ])
    },
    { timeout: 300000 },
  )
}

export default formattedEventHandler(async (event) => {
  const articles = await queryCollection(event, 'content')
    .select(...ARTICLE_FIELDS)
    .all()
  await handleArticles(articles.filter(article => !titleBlacklist.includes(article.title!)))
})
