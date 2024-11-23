<script setup lang="ts">
definePageMeta({
  name: 'categories',
})

const { data: fetchedCategories } = await useFetch('/api/categories/list')

const categories = computed(() => fetchedCategories.value ? fetchedCategories.value.payload ?? [] : [])
</script>

<template>
  <div>
    <header class="mb-5">
      <div class="text-xl text-hana-blue">
        <span class="text-xl">目前共计 <span class="font-bold">{{ categories.length }}</span> 个目录...我还有很多想写的东西</span>
      </div>
    </header>
    <div class="grid grid-cols-1 gap-8 md:grid-cols-2">
      <ArticleCategory v-for="(category, index) in categories" :key="`${category}-${index}`" :category="category" :index="index" />
    </div>
  </div>
</template>
