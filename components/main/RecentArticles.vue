<script setup lang="ts">
import type { ArticleCardProps } from '~/types/article'

const { data } = await useAsyncData('recent-articles', () => queryContent('articles').limit(6).sort({ _id: -1 }).find())

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
  <HanaInfoCard title="最近文章" icon="lucide:newspaper" to="/articles">
    <div class=" grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
      <HanaArticleCard v-for="card in articleCards" :key="card.title" v-bind="card" />
    </div>
  </HanaInfoCard>
</template>
