<script setup lang="ts">
import type { ArticleHeader } from '~/types/content'

definePageMeta({
  name: 'article-detail',
})

const { path } = useRoute()

const { data: article, error } = await useAsyncData(`article-${path}`, () => queryContent(path).findOne())

if (error.value) {
  navigateTo('/404')
}

const articleHeader = computed<ArticleHeader>(() => ({
  title: article.value?.title || '暂无标题',
  description: article.value?.description || '暂无简介~',
  cover: article.value?.cover || '/images/not-found.webp',
  alt: article.value?.alt || '暂无图片',
  ogImage: article.value?.ogImage || '/images/not-found.webp',
  tags: article.value?.tags || [],
  publishedAt: article.value?.publishedAt || '',
  editedAt: article.value?.editedAt || '',
  published: article.value?.published || false,
  wordCount: article.value?.wordCount || 0,
}))

defineOgImageComponent('og-image', {
  title: articleHeader.value.title,
  description: articleHeader.value.description,
  link: articleHeader.value.ogImage,
})
</script>

<template>
  <div class="min-h-screen w-full">
    <ArticleHeader v-if="article" v-bind="articleHeader" />
    <div class="flex gap-5">
      <div class="prose w-full max-w-none">
        <ContentRenderer v-if="article" :value="article">
          <template #empty>
            <p>No content found.</p>
          </template>
        </ContentRenderer>
      </div>
      <div class="hidden lg:block">
        <div class="sticky top-48 flex flex-col gap-5">
          <ArticleSwitch />
          <ArticleToc v-if="article" :article="article" />
        </div>
      </div>
    </div>
  </div>
</template>
