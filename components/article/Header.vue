<script setup lang="ts">
import type { ArticleHeader } from '~/types/content'
import { useStore } from '~/store'

withDefaults(defineProps<ArticleHeader>(), {
  title: '暂无标题',
  description: '暂无简介~',
  cover: '/images/not-found.webp',
  alt: '暂无图片',
  ogImage: '/images/not-found.webp',
  tags: () => [],
  category: '未分类',
  publishedAt: '',
  editedAt: '',
  published: false,
  wordCount: 0,
})

const { articleHeadStatusStore } = useStore()
const { setVisible } = articleHeadStatusStore

const articleHeadRef = ref<HTMLElement | null>(null)
let headObserver: IntersectionObserver | null = null

onMounted(() => {
  if (!articleHeadRef.value)
    return

  headObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      setVisible(entry.isIntersecting)
    })
  }, { threshold: 1.0 })

  headObserver.observe(articleHeadRef.value)
})

onUnmounted(() => {
  headObserver?.disconnect()
})
</script>

<template>
  <header ref="articleHeadRef" class="mb-10 flex flex-col gap-5">
    <NuxtImg :src="cover" :alt="alt" class="h-60 rounded-lg object-cover" />
    <h1 class="font-bold">
      {{ title }}
    </h1>
    <p class="text-text">
      {{ description }}
    </p>
    <div class="flex gap-2 overflow-auto">
      <ArticleTag v-for="tag in tags" :key="tag" :name="tag" :to="`/articles/tags/filter?tag=${tag}`" />
    </div>
    <div class="flex flex-wrap items-center gap-4 text-text">
      <span class="flex items-center gap-2">
        <Icon name="lucide:calendar" />
        <time :datetime="publishedAt">{{ publishedAt }}</time>
      </span>
      <span class="flex items-center gap-2">
        <Icon name="lucide:refresh-cw" />
        <time :datetime="editedAt">{{ editedAt }}</time>
      </span>
      <span class="flex items-center gap-2">
        <Icon name="lucide:file-text" />
        {{ wordCount }}字
      </span>
    </div>
  </header>
</template>
