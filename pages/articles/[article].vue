<script setup lang="ts">
import type { ArticleHeader } from '~/types/content'
import type { ArticleMarkdownPayload, Neighbors } from '~/types/markdown'
import { seoData } from '~/data/meta'
import { useStore } from '~/store'
import { getArticleOgImageDefinition } from '~/utils/article-og-image'

const { articleStore } = useStore()
const { headerVisible } = toRefs(articleStore)

definePageMeta({
  name: ARTICLE_DETAIL_PAGE,
})

const route = useRoute()
const requestUrl = useRequestURL()

// 从数据库获取文章详情
const { data: articleResponse } = await useFetch('/api/articles/detail', {
  key: () => `article-${route.path}`,
  query: { path: route.path },
})

const article = computed(() => (articleResponse.value?.payload as ArticleMarkdownPayload | null) ?? null)

if (article.value) {
  articleStore.setContent(article.value)
}

// 从数据库获取前后文章
const { data: neighborsResponse } = await useFetch('/api/articles/neighbors', {
  key: () => `article-${route.path}-surroundings`,
  query: { path: route.path },
})

const neighbors = computed<Neighbors>(() => (neighborsResponse.value?.payload as Neighbors | null) ?? [null, null])

if (neighbors.value && neighbors.value.length > 0) {
  articleStore.setNeighbors(neighbors.value)
}

const [prev, next] = neighbors.value

const articleOgImageDefinition = computed(() => article.value
  ? getArticleOgImageDefinition({
      to: article.value.path,
      title: article.value.title,
      publishedAt: article.value.publishedAt,
    })
  : null)
const articleUrl = computed(() => new URL(route.path, `${seoData.mySite}/`).toString())
const articleSeoImage = computed(() => {
  const image = article.value?.displayImage || seoData.image

  return new URL(image, requestUrl.origin).toString()
})

const articleHeader = computed<ArticleHeader>(() => ({
  title: article.value?.title || '暂无标题',
  description: article.value?.description || '暂无简介',
  image: article.value?.displayImage || '/images/not-found.webp',
  imageSource: article.value?.displayImageSource || 'generated',
  alt: article.value?.alt || '暂无图片',
  tags: article.value?.tags || [],
  category: article.value?.category || '未分类',
  publishedAt: formatDateYmd(article.value?.publishedAt),
  editedAt: formatDateYmd(article.value?.editedAt),
  published: article.value?.published || false,
  wordCount: article.value?.wordCount || 0,
}))

if (articleOgImageDefinition.value) {
  defineOgImage(articleOgImageDefinition.value.component, articleOgImageDefinition.value.props)
}

useHead({
  title: () => articleHeader.value.title,
  link: [
    {
      rel: 'canonical',
      href: () => articleUrl.value,
    },
  ],
})

useSeoMeta({
  title: () => articleHeader.value.title,
  description: () => articleHeader.value.description,
  ogTitle: () => articleHeader.value.title,
  ogDescription: () => articleHeader.value.description,
  ogImage: () => articleSeoImage.value,
  ogSiteName: seoData.siteName,
  ogType: 'website',
  ogUrl: () => articleUrl.value,
  twitterSite: seoData.twitterHandle,
  twitterCard: 'summary_large_image',
  twitterTitle: () => articleHeader.value.title,
  twitterDescription: () => articleHeader.value.description,
  twitterImage: () => articleSeoImage.value,
})
</script>

<template>
  <div class="mx-auto max-w-5xl w-full min-h-dvh">
    <div class="flex items-start gap-8">
      <div class="w-full xl:min-w-0 xl:flex-1">
        <ArticleHeader v-if="article" v-bind="articleHeader" />
        <div class="max-w-none leading-7 dark:text-hana-white">
          <MarkdownRenderer v-if="article" :value="article" class="flex flex-col gap-4">
            <template #empty>
              <p>No content found.</p>
            </template>
          </MarkdownRenderer>
        </div>
        <div class="mt-5">
          <Comment />
        </div>
      </div>
      <div class="hidden xl:block xl:w-60 xl:shrink-0">
        <div class="fixed flex flex-col gap-5 transition-all" :class="{ '-mt-20': !headerVisible }">
          <ArticleAuthor />
          <ArticleSwitch :prev="prev" :next="next" />
          <ArticleToc v-if="article?.toc" :toc="article.toc" />
        </div>
      </div>
    </div>
  </div>
</template>
