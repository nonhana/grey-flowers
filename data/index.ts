export const navbarData = {
  homeTitle: 'GreyFlowers',
}

export const articlePageData = {
  title: 'Articles',
  description: 'Here are some articles I wrote. I hope you can find something useful, just like the petals.',
}

export const aboutPageData = {
  title: 'About',
  description: 'Hi, I\'m non_hana, a senior and a Node.js developer eager to learn. I\'m skilled in TypeScript, Vue, and React, and always working hard to improve.',
}

export const thoughtsPageData = {
  title: 'Thoughts',
  description: 'I have a lot of thoughts in my mind. I hope you can find something interesting here.',
}

export const friendsPageData = {
  title: 'Friends',
  description: 'Here are some friends of mine. If you like my blog, you may also like their blogs.',
}

export const seoData = {
  title: 'GreyFlowers - 在失去了意义的世界里，会绽放出什么颜色的花朵呢',
  ogTitle: 'A garden to study programming, explore myself, and vent emotions - GreyFlowers',
  description: 'Even in a grey world, flowers bloom as ever. - GreyFlowers',
  keywords: '全栈开发, Web 开发教程, JavaScript 技巧, Vue, React, Angular, Svelte, Solid.js, Node.js 后端, 前端性能优化, 面向开发人员的 TypeScript, 编码挑战, 软件工程原理',
  twitterDescription: 'A garden to study programming, explore myself, and vent emotions. Built by Nuxt3 with Tailwindcss - GreyFlowers',
  image: 'https://moe.greyflowers.pics/greyflowers-ogimg.webp',
  mySite: 'https://www.greyflowers.moe',
  twitterHandle: '@non_hanaz',
  mailAddress: 'zhouxiang757@gmail.com',
}

export const siteMetaData = [
  {
    name: 'description',
    content: seoData.description,
  },
  // Test on: https://developers.facebook.com/tools/debug/ or https://socialsharepreview.com/
  { property: 'og:site_name', content: seoData.mySite },
  { property: 'og:type', content: 'website' },
  {
    property: 'og:url',
    content: seoData.mySite,
  },
  {
    property: 'og:title',
    content: seoData.ogTitle,
  },
  {
    property: 'og:description',
    content: seoData.description,
  },
  {
    property: 'og:image',
    content: seoData.image,
  },
  // Test on: https://cards-dev.twitter.com/validator or https://socialsharepreview.com/
  { name: 'twitter:site', content: seoData.twitterHandle },
  { name: 'twitter:card', content: 'summary_large_image' },
  {
    name: 'twitter:url',
    content: seoData.mySite,
  },
  {
    name: 'twitter:title',
    content: seoData.ogTitle,
  },
  {
    name: 'twitter:description',
    content: seoData.twitterDescription,
  },
  {
    name: 'twitter:image',
    content: seoData.image,
  },
]
