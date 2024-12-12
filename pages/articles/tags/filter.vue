<script setup lang="ts">
const route = useRoute()

const tag = computed(() => route.query.tag)

useHead({
  title: tag.value as string,
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
