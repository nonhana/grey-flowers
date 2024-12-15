<script setup lang="ts">
import { seoData } from '~/data/meta'

useHead({
  title: seoData.title,
  htmlAttrs: {
    lang: 'zh-Hans',
  },
  meta: [
    {
      name: 'description',
      content: seoData.description,
    },
    {
      name: 'keywords',
      content: seoData.keywords,
    },
  ],
})
</script>

<template>
  <MainBody />
</template>
