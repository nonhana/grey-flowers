<script setup lang="ts">
import type { ArticleHeader } from '~/types/content'
import { Calendar, FileText, RefreshCw } from '@lucide/vue'
import { useStore } from '~/store'

const props = withDefaults(defineProps<ArticleHeader>(), {
  title: '暂无标题',
  description: '暂无简介',
  image: '/images/not-found.webp',
  imageSource: 'cover',
  alt: '暂无图片',
  tags: () => [],
  category: '未分类',
  publishedAt: '',
  editedAt: '',
  published: false,
  wordCount: 0,
})

const { articleStore } = useStore()
const { setHeaderVisible } = articleStore

const articleHeadRef = useTemplateRef('articleHeadRef')
let headObserver: IntersectionObserver | null = null

onMounted(() => {
  if (!articleHeadRef.value)
    return

  headObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      setHeaderVisible(entry.isIntersecting)
    })
  })

  headObserver.observe(articleHeadRef.value)
})

onUnmounted(() => {
  headObserver?.disconnect()
})

const imageAlt = computed(() => props.imageSource === 'generated' ? `${props.title} Nuxt OgImage` : props.alt)
</script>

<template>
  <header ref="articleHeadRef" class="mb-10 flex flex-col gap-5">
    <div class="overflow-hidden rounded-lg">
      <img
        v-if="props.imageSource === 'generated'"
        :src="image"
        :alt="imageAlt"
        loading="eager"
        fetchpriority="high"
        class="block size-full transition-transform object-cover hover:scale-110"
      >
      <NuxtPicture
        v-else
        :src="image"
        :alt="imageAlt"
        sizes="100vw xl:960px"
        class="block size-full"
        :img-attrs="{
          class: [
            'block size-full transition-transform object-cover hover:scale-110',
            { 'object-left': imageSource === 'generated' },
          ],
          loading: 'eager',
          fetchpriority: 'high',
        }"
      />
    </div>
    <h1 class="text-3xl font-bold dark:text-hana-white">
      {{ title }}
    </h1>
    <p class="text-text dark:text-hana-white-700">
      {{ description }}
    </p>
    <div class="flex gap-2 overflow-auto">
      <ArticleTag v-for="tag in tags" :key="tag" :name="tag" :to="`/articles/tags/filter?tag=${tag}`" />
    </div>
    <div class="flex flex-wrap items-center gap-4 text-text dark:text-hana-white-700">
      <span class="flex items-center gap-2">
        <Calendar />
        <time :datetime="publishedAt">{{ publishedAt }}</time>
      </span>
      <span class="flex items-center gap-2">
        <RefreshCw />
        <time :datetime="editedAt">{{ editedAt }}</time>
      </span>
      <span class="flex items-center gap-2">
        <FileText />
        {{ wordCount }}字
      </span>
    </div>
  </header>
</template>
