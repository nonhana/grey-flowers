<script setup lang="ts">
import type { MarkdownPagePayload } from '~/types/markdown'

const { data: articleResponse } = await useFetch('/api/markdown/about', {
  key: 'about-article',
})

const article = computed(() => (articleResponse.value?.payload as MarkdownPagePayload | null) ?? null)
</script>

<template>
  <MarkdownRenderer v-if="article" :value="article" class="flex flex-col gap-4 leading-7 dark:text-hana-white" />
</template>
