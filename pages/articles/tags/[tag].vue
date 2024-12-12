<script setup lang="ts">
const route = useRoute()

const tag = computed(() => route.path.split('/').pop())

useHead({
  title: tag.value,
  meta: [
    {
      name: 'description',
      content: `Here you can find all articles with the ${tag.value} tag`,
    },
  ],
})
</script>

<template>
  <ArticleMain type="tags" />
</template>
