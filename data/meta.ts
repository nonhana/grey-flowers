export const navbarData = {
  homeTitle: 'GreyFlowers',
}

export const articlePageData = {
  title: 'Articles',
  description: 'Here are some articles I wrote. I hope you can find something useful, just like the petals.',
}

export const articleTagsData = {
  title: 'Tags',
  description: 'Here is a list of the tags of all articles published on this site and the corresponding number of articles.',
}

export const articleCategoriesData = {
  title: 'Categories',
  description: 'This is a summary of the category my article belongs to. Here you can find one that interest you and start to read.',
}

export const articleArchivesData = {
  title: 'Archives',
  description: 'Here is an archive of all my articles, organized by year and month.',
}

export const aboutPageData = {
  title: 'About',
  description: 'Hi, I\'m non_hana, a senior and a Node.js developer eager to learn. I\'m skilled in TypeScript, Vue, and React, and always working hard to improve.',
}

export const thoughtsPageData = {
  title: 'Thoughts',
  description: 'I have a lot of thoughts in my mind. I hope you can find something interesting here.',
}

export const recentlyPageData = {
  title: 'Recently',
  description: 'Here are some of my recent activities, including articles, thoughts, and other things.',
}

export const linksPageData = {
  title: 'Links',
  description: 'Here are some friends and some works of mine. If you like my blog, you may also like their blogs.',
}

export const seoData = {
  title: '在失去了意义的世界里，会绽放出什么颜色的花朵呢',
  ogTitle: 'A garden to study programming, explore myself, and vent emotions.',
  description: 'Even in a grey world, flowers bloom as ever.',
  keywords: '全栈开发, Web 开发教程, JavaScript 技巧, Vue, React, Angular, Svelte, Solid.js, Node.js 后端, 前端性能优化, 面向开发人员的 TypeScript, 编码挑战, 软件工程原理',
  image: 'https://static-r2.caelum.moe/greyflowers-ogimg.webp',
  mySite: 'https://caelum.moe',
  twitterHandle: '@non_hanaz',
  mailAddress: 'zhouxiang757@gmail.com',
}

export const siteMetaData = {
  title: seoData.ogTitle,
  ogTitle: seoData.ogTitle,
  description: seoData.description,

  // Test on: https://developers.facebook.com/tools/debug/ or https://socialsharepreview.com/
  ogDescription: seoData.description,
  ogImage: seoData.image,
  ogSiteName: seoData.mySite,
  ogType: 'website',
  ogUrl: seoData.mySite,

  // Test on: https://cards-dev.twitter.com/validator or https://socialsharepreview.com/
  twitterSite: seoData.twitterHandle,
  twitterCard: 'summary_large_image',
  twitterUrl: seoData.mySite,
  twitterTitle: seoData.ogTitle,
  twitterDescription: seoData.description,
  twitterImage: seoData.image,
} as const
