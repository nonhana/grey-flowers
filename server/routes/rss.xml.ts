import { Feed } from 'feed'

const titleBlacklist = ['About', 'Friends']

const basePath = 'https://caelum.moe'

export default defineEventHandler(async (event) => {
  setHeader(event, 'content-type', 'text/xml')
  const result = await queryCollection(event, 'content')
    .select('title', 'path', 'description', 'publishedAt', 'cover')
    .order('publishedAt', 'DESC')
    .all()
  const articles = result.filter(article => !titleBlacklist.includes(article.title!))
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
    feed.addItem({
      title: article.title || '',
      id: basePath + article.path,
      link: basePath + article.path,
      description: article.description,
      content: article.description,
      date: new Date(article.publishedAt),
      image: `${basePath}/_ipx/q_85${article.cover}`,
    })
  })

  return feed.rss2()
})
