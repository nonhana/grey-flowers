<script setup lang="ts">
definePageMeta({
  name: 'categories',
})

const { data } = await useAsyncData('article-tags', () => queryContent('articles').only(['category']).find())

const categories = computed(() => {
  if (!data.value)
    return []
  const categorySet = new Set(data.value.map(article => article.category as string))
  return Array.from(categorySet)
})
</script>

<template>
  <div class="grid grid-cols-1 gap-8 md:grid-cols-2">
    <ArticleCategory v-for="category in categories" :key="category" :title="category" />
  </div>
</template>
