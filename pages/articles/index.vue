<script setup lang="ts">
import type { ArticleCardProps } from '~/types/article'

const page = ref(1)
const pageSize = ref(6)
const { data } = await useAsyncData('recent-articles', () => queryContent('articles')
  .skip((page.value - 1) * pageSize.value)
  .limit(pageSize.value)
  .sort({ _id: -1 })
  .find())

const articleCards = computed<ArticleCardProps[]>(() =>
  data.value?.map((article) => {
    return {
      to: article._path || '/404',
      title: article.title || '暂无标题',
      description: article.description || '暂无简介~',
      cover: article.cover || '/images/not-found.webp',
      tags: article.tags || [],
      publishedAt: new Date(article.publishedAt || '').toLocaleDateString(),
      editedAt: new Date(article.editedAt || '').toLocaleDateString(),
      wordCount: article.wordCount || 0,
    }
  }) || [],
)
</script>

<template>
  <div>
    <div class="flex flex-col gap-5">
      <HanaArticleCard v-for="card in articleCards" :key="card.title" type="detail" v-bind="card" />
    </div>
  </div>
</template>
