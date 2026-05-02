<script setup lang="ts">
import type { Toc } from '@nuxt/content'
import type { NeighborItem } from '~/store/modules/article'
import type { ArticleHeader } from '~/types/content'
import dayjs from 'dayjs'
import { navbarData, seoData } from '~/data/meta'
import { useStore } from '~/store'

const { articleStore } = useStore()
const { headerVisible } = toRefs(articleStore)

const img = useImage()

definePageMeta({
  name: ARTICLE_DETAIL_PAGE,
})

const route = useRoute()

// 从数据库获取文章详情
const { data: articleResponse } = await useFetch('/api/articles/detail', {
  key: () => `article-${route.path}`,
  query: { path: route.path },
})

const article = computed(() => articleResponse.value?.payload)

if (article.value) {
  articleStore.setContent(article.value)
}

// 从数据库获取前后文章
const { data: neighborsResponse } = await useFetch('/api/articles/neighbors', {
  key: () => `article-${route.path}-surroundings`,
  query: { path: route.path },
})

const neighbors = computed(() => (neighborsResponse.value?.payload || [null, null]) as [NeighborItem, NeighborItem])

if (neighbors.value && neighbors.value.length > 0) {
  articleStore.setNeighbors(neighbors.value)
}

const [prev, next] = neighbors.value

const articleHeader = computed<ArticleHeader>(() => ({
  title: article.value?.title || '暂无标题',
  description: article.value?.description || '暂无简介',
  cover: article.value?.cover || '/images/not-found.webp',
  alt: article.value?.alt || '暂无图片',
  ogImage: article.value?.ogImage || '/images/not-found.webp',
  tags: article.value?.tags || [],
  category: article.value?.category || '未分类',
  publishedAt: dayjs(article.value?.publishedAt).format('YYYY-MM-DD'),
  editedAt: dayjs(article.value?.editedAt).format('YYYY-MM-DD'),
  published: article.value?.published || false,
  wordCount: article.value?.wordCount || 0,
}))

useHead({
  title: articleHeader.value.title,
  link: [
    {
      rel: 'canonical',
      href: `${seoData.mySite}/${route.path}`,
    },
  ],
})

useSeoMeta({
  title: articleHeader.value.title,
  description: articleHeader.value.description,
  ogTitle: articleHeader.value.title,
  ogDescription: articleHeader.value.description,
  ogImage: seoData.mySite + img(articleHeader.value.ogImage, { quality: 85 }),
  ogSiteName: navbarData.homeTitle,
  ogType: 'website',
  ogUrl: `${seoData.mySite}/${route.path}`,
  twitterSite: '@non_hanaz',
  twitterCard: 'summary_large_image',
  twitterTitle: articleHeader.value.title,
  twitterDescription: articleHeader.value.description,
  twitterImage: articleHeader.value.ogImage,
})
</script>

<template>
  <div class="mx-auto max-w-5xl w-full min-h-dvh">
    <div class="flex items-start gap-8">
      <div class="w-full xl:min-w-0 xl:flex-1">
        <ArticleHeader v-if="article" v-bind="articleHeader" />
        <div class="max-w-none leading-7 dark:text-hana-white">
          <ContentRenderer v-if="article" :value="article" class="flex flex-col gap-4">
            <template #empty>
              <p>No content found.</p>
            </template>
          </ContentRenderer>
        </div>
        <div class="mt-5">
          <Comment />
        </div>
      </div>
      <div class="hidden xl:block xl:w-60 xl:shrink-0">
        <div class="fixed flex flex-col gap-5 transition-all" :class="{ '-mt-20': !headerVisible }">
          <ArticleAuthor />
          <ArticleSwitch :prev="prev" :next="next" />
          <ArticleToc v-if="article" :toc="article.body.toc as unknown as Toc" />
        </div>
      </div>
    </div>
  </div>
</template>
