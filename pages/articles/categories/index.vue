<script setup lang="ts">
definePageMeta({
  name: 'categories',
})

const { data } = await useAsyncData('article-categories', () => $fetch('/api/categories/list'))

const categories = computed(() => data.value || [])
</script>

<template>
  <div>
    <header class="mb-5">
      <div class="text-xl text-hana-blue">
        <span class="text-xl">目前共计 <span class="font-bold">{{ categories.length }}</span> 个目录...不同方向的知识，都需要掌握</span>
      </div>
    </header>
    <div class="grid grid-cols-1 gap-8 md:grid-cols-2">
      <ArticleCategory v-for="(category, index) in categories" :key="`${category}-${index}`" :category="category" :index="index" />
    </div>
  </div>
</template>
