<script setup lang="ts">
import type { ArticleCardProps } from '~/types/article'

withDefaults(
  defineProps<
    ArticleCardProps & { index: number, displayCols?: number }
>(),
  { type: 'common', displayCols: 1 },
)

const opacity = ref(0)
const top = ref('10px')

onMounted(() => {
  floatAnimation(opacity, top)
})
</script>

<template>
  <div :style="{ transition: `all 0.2s ${index * 0.1}s`, opacity, transform: `translateY(${top})` }">
    <NuxtLink
      :to="to"
      :aria-label="title"
      :title="title"
      class="group relative top-0 block w-full overflow-hidden rounded-3xl bg-white transition-all active:scale-95 active:bg-hana-blue-200 dark:bg-hana-black-700 hover:bg-hana-blue-150 hover:shadow-lg hover:-translate-y-1 dark:active:bg-hana-black-800 dark:hover:bg-hana-black-800"
      :class="{ 'md:flex md:rounded-lg': type === 'detail', 'md:flex-row-reverse': index % 2 === 0 }"
    >
      <div class="relative aspect-[3/2]" :class="{ 'md:h-36': type === 'detail', 'md:hidden': displayCols > 1 && type === 'detail' }">
        <NuxtImg :src="cover" :alt="`${title}_cover`" class="size-full transition-transform duration-300 object-cover group-hover:scale-105" />
      </div>
      <div
        class="relative h-36 w-full flex flex-col justify-between p-4"
        :class="{ 'md:items-center': type === 'detail' }"
      >
        <div class="h-6 flex flex-wrap gap-2 overflow-hidden">
          <ArticleTag v-for="tag in tags" :key="tag" :name="tag" size="small" />
        </div>
        <span class="text-lg font-bold leading-none dark:text-hana-white">{{ title }}</span>
        <div class="inline-block">
          <span class="text-text line-clamp-1 dark:text-hana-white-700" :class="{ 'md:text-center': type === 'detail' }">
            {{ description }}
          </span>
        </div>
        <div class="flex gap-2 text-sm text-text leading-none dark:text-hana-white-700">
          <span class="flex items-center space-x-1">
            <Icon name="lucide:calendar" size="14" />
            <time :datetime="publishedAt">{{ publishedAt }}</time>
          </span>
          <span class="flex items-center space-x-1">
            <Icon name="lucide:file-text" size="14" />
            <span>{{ wordCount }}字</span>
          </span>
        </div>
      </div>
    </NuxtLink>
  </div>
</template>
