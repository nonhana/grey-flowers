<script setup lang="ts">
const route = useRoute()

const category = computed(() => route.path.split('/').pop())

useHead({
  title: category.value,
  meta: [
    {
      name: 'description',
      content: `Here you can find all articles classified under ${category.value}`,
    },
  ],
})
</script>

<template>
  <ArticleMain type="category" />
</template>
