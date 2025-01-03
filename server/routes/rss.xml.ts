import { serverQueryContent } from '#content/server'
import { Feed } from 'feed'

const titleBlacklist = ['About', 'Friends']

const basePath = 'https://www.greyflowers.moe'

export default defineEventHandler(async (event) => {
  setHeader(event, 'content-type', 'text/xml')
  const result = await serverQueryContent(event).without(['body']).sort({ date: -1 }).find()
  const articles = result.filter(article => !titleBlacklist.includes(article.title!))
  const feed = new Feed({
    title: 'GreyFlowers',
    description: '在失去了意义的世界里，会绽放出什么颜色的花朵呢',
    id: basePath,
    link: basePath,
    language: 'zh-CN',
    favicon: `${basePath}/favicon.ico`,
    copyright: 'MIT',
    image: 'https://moe.greyflowers.pics/greyflowers-ogimg.webp',
    author: {
      name: 'non_hana',
      email: 'zhouxiang757@gmail.com',
      link: basePath,
    },
  })

  articles.forEach((doc) => {
    feed.addItem({
      title: doc.title || '',
      id: basePath + doc._path,
      link: basePath + doc._path,
      description: doc.description,
      content: doc.description,
      date: new Date(doc.publishedAt),
      image: `${basePath}/_ipx/q_85${doc.cover}`,
    })
  })

  return feed.rss2()
})
