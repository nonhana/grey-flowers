<script setup lang="ts">
import type { ArticleCardProps } from '~/types/article'

withDefaults(defineProps<ArticleCardProps>(), { type: 'common' })
</script>

<template>
  <NuxtLink
    :to="to"
    :title="title"
    class="relative top-0 block w-full overflow-hidden rounded-3xl bg-white transition-all hover:-top-1 hover:bg-hana-blue-200/40 hover:shadow-lg active:scale-95 active:bg-hana-blue-200" :class="{ 'md:rounded-lg md:article-detail-item': type === 'detail' }"
  >
    <div class="relative aspect-[3/2]" :class="{ 'md:h-36': type === 'detail' }">
      <NuxtImg :src="cover" :alt="`${title}_cover`" class="size-full object-cover" />
    </div>
    <div class="relative flex h-36 w-full flex-col justify-between p-4" :class="{ 'md:items-center': type === 'detail' }">
      <div class="flex h-6 flex-wrap gap-2 overflow-hidden">
        <ArticleTag v-for="tag in tags" :key="tag" :name="tag" size="small" />
      </div>
      <span class="line-clamp-1 text-lg font-bold leading-none">
        {{ title }}
      </span>
      <div class="inline-block">
        <span class="line-clamp-2 leading-none text-text" :class="{ 'md:line-clamp-1 md:text-center': type === 'detail' }">
          {{ description }}
        </span>
      </div>
      <div class="flex gap-2 text-sm leading-none text-text">
        <span class="flex items-center space-x-1">
          <Icon name="lucide:calendar" size="14" />
          <time :datetime="publishedAt">{{ publishedAt }}</time>
        </span>
        <span class="flex items-center space-x-1">
          <Icon name="lucide:file-text" size="14" />
          {{ wordCount }}字
        </span>
      </div>
    </div>
  </NuxtLink>
</template>
