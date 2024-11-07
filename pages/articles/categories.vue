<script setup lang="ts">
definePageMeta({
  name: 'categories',
})
</script>

<template>
  <div class="grid grid-cols-1 gap-8 md:grid-cols-2">
    <ArticleCategory v-for="i in 10" :key="i" />
  </div>
</template>
