<script setup lang="ts">
import type { ArticleCardProps } from '~/types/article'

const { t, locale } = useI18n()

useHead({
  title: t('head.name'),
  htmlAttrs: {
    lang: locale.value,
  },
  meta: [
    {
      name: 'description',
      content: t('head.description'),
    },
    {
      name: 'keywords',
      content: t('head.keywords'),
    },
  ],
})

const articleCards = ref<ArticleCardProps[]>(Array.from({ length: 6 }).fill(0).map((_, index) => ({
  id: index,
  title: 'Hello, World!',
  description: 'This is the first article.This is the first article.This is the first article.This is the first article.This is the first article.This is the first article.This is the first article.This is the first article.This is the first article.This is the first article.This is the first article.This is the first article.',
  cover: 'http://dummyimage.com/400X400',
  tags: ['Hello', 'World'],
  publishedAt: '2022-01-01',
  editedAt: '2022-01-01',
  wordCount: 1000,
})))
</script>

<template>
  <div class="h-[2000px]">
    <HanaInfoCard title="最近文章" icon="lucide:newspaper" to="/articles">
      <div
        class=" grid
        grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3"
      >
        <HanaArticleCard v-for="card in articleCards" :key="card.id" v-bind="card" />
      </div>
    </HanaInfoCard>
  </div>
</template>
