<script setup lang="ts">
import { articlePageData } from '~/data/meta'

definePageMeta({
  name: 'articles',
})

useHead({
  title: articlePageData.title,
  meta: [
    {
      name: 'description',
      content: articlePageData.description,
    },
  ],
})
</script>

<template>
  <ArticleMain />
</template>
