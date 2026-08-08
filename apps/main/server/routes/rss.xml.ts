import type { ArticleListData } from '@grey-flowers/contracts'
import { Feed } from 'feed'

import { apiGet } from '#server/utils/api-gateway'
import { resolveArticleImagePolicy, toAbsoluteArticleImageUrl } from '#server/utils/article-generated-image'
import { STATIC_MARKDOWN_TITLES } from '#server/utils/markdown'

const basePath = 'https://caelum.moe'

const RSS_PAGE_SIZE = 50

/** 拉取全部已发布文章（API 侧已强制 published: true），分页收集。 */
async function fetchAllPublishedArticles(): Promise<ArticleListData['items']> {
  const items: ArticleListData['items'] = []
  let total = Number.POSITIVE_INFINITY

  for (let page = 1; items.length < total; page += 1) {
    const data = await apiGet<ArticleListData>(
      '/public/articles/list',
      { page, pageSize: RSS_PAGE_SIZE },
    )
    items.push(...data.items)
    total = data.total
    if (data.items.length === 0)
      break
  }

  return items
}

export default defineEventHandler(async (event) => {
  setHeader(event, 'content-type', 'text/xml')

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

  try {
    const articles = (await fetchAllPublishedArticles())
      .filter(article => !STATIC_MARKDOWN_TITLES.includes(article.title))

    articles.forEach((article) => {
      const { displayImage } = resolveArticleImagePolicy({
        to: article.to,
        title: article.title,
        cover: article.cover,
        publishedAt: article.publishedAt,
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
  }

  catch (error) {
    // 公开文章接口不可用时仍输出空的合法 feed，避免构建/定时抓取因 API 抖动失败；
    // 但降级必须留痕，否则「RSS 突然变空」在服务端毫无线索可查。
    console.error('[rss.xml] 拉取公开文章列表失败，输出空 feed 降级', error)
  }

  return feed.rss2()
})
