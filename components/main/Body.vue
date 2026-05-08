<script setup lang="ts">
import type { ArticleCardProps } from '~/types/article'

const { data: fetchArticleData } = await useFetch('/api/articles/list', { query: { page: 1, pageSize: 5 } })
const articleData = computed(() => fetchArticleData.value ? fetchArticleData.value.payload ?? [] : [])

const articleCards = computed<ArticleCardProps[]>(() =>
  articleData.value.map((article) => {
    return {
      to: article.to,
      title: article.title,
      description: article.description || '暂无简介',
      cover: article.cover || '/images/not-found.webp',
      tags: article.tags,
      publishedAt: article.publishedAt,
      editedAt: article.editedAt,
      wordCount: article.wordCount,
    }
  }),
)

const featuredArticle = computed(() => articleCards.value[0] ?? null)
const secondaryArticleCards = computed(() => articleCards.value.slice(1))
</script>

<template>
  <div class="flex flex-col gap-12">
    <!-- 最近动态 -->
    <MainActivity />

    <!-- 最近文章 -->
    <HanaInfoCard title="最近文章" icon="lucide:newspaper">
      <div v-if="featuredArticle" class="grid gap-4 2xl:grid-cols-3 md:grid-cols-2">
        <ArticleCard
          :key="`${featuredArticle.title}-featured`"
          v-bind="{ ...featuredArticle, index: 0 }"
          variant="featured"
          class="md:col-span-2"
        />
        <ArticleCard
          v-for="(card, index) in secondaryArticleCards"
          :key="`${card.title}-compact-${index}`"
          v-bind="{ ...card, index: index + 1 }"
          variant="compact"
        />
      </div>
    </HanaInfoCard>
  </div>
</template>
