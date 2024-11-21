<script setup lang="ts">
import type { ArticleCardProps } from '~/types/article'

const { data } = await useAsyncData('recent-articles', () => $fetch('/api/articles/list', { query: { page: 1, pageSize: 6 } }))

const articleCards = computed<ArticleCardProps[]>(() =>
  data.value?.map((article) => {
    return {
      to: article.to,
      title: article.title,
      description: article.description || '暂无简介~',
      cover: article.cover || '/images/not-found.webp',
      tags: article.tags,
      publishedAt: article.publishedAt,
      editedAt: article.editedAt,
      wordCount: article.wordCount,
    }
  }) || [],
)
</script>

<template>
  <HanaInfoCard title="最近文章" icon="lucide:newspaper" to="/articles">
    <div class="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
      <HanaArticleCard v-for="(card, index) in articleCards" :key="card.title" v-bind="{ ...card, index }" />
    </div>
  </HanaInfoCard>
</template>
