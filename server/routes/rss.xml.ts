import { Feed } from 'feed'
import prisma from '~/lib/prisma'
import { resolveArticleImagePolicy, toAbsoluteArticleImageUrl } from '~/utils/article-generated-image'

const titleBlacklist = ['About', 'Friends']

const basePath = 'https://caelum.moe'

export default defineEventHandler(async (event) => {
  setHeader(event, 'content-type', 'text/xml')
  const result = await prisma.article.findMany({
    select: {
      title: true,
      to: true,
      description: true,
      publishedAt: true,
      cover: true,
      category: { select: { name: true } },
      tags: { select: { name: true } },
    },
    orderBy: {
      publishedAt: 'desc',
    },
  })
  const articles = result.filter(article => !titleBlacklist.includes(article.title))
  const feed = new Feed({
    title: 'GreyFlowers',
    description: '在失去了意义的世界里，会绽放出什么颜色的花朵呢',
    id: basePath,
    link: basePath,
    language: 'zh-CN',
    favicon: `${basePath}/favicon.ico`,
    copyright: 'MIT',
    image: 'https://static-r2.caelum.moe/greyflowers-ogimg.webp',
    author: {
      name: 'non_hana',
      email: 'nonhana@outlook.com',
      link: basePath,
    },
  })

  articles.forEach((article) => {
    const { displayImage } = resolveArticleImagePolicy({
      to: article.to,
      title: article.title,
      cover: article.cover,
      publishedAt: article.publishedAt.toISOString(),
    })

    feed.addItem({
      title: article.title,
      id: basePath + article.to,
      link: basePath + article.to,
      description: article.description ?? '',
      content: article.description ?? '',
      date: new Date(article.publishedAt),
      image: toAbsoluteArticleImageUrl(displayImage, basePath),
    })
  })

  return feed.rss2()
})
