<script setup lang="ts">
import type { ArticleCardProps } from '~/types/article'

const props = withDefaults(defineProps<ArticleCardProps & { index: number, displayCols?: number }>(), { type: 'common', displayCols: 1 })

const opacity = ref(0)
const top = ref('10px')

function resetAnimation() {
  opacity.value = 0
  top.value = '10px'
  setTimeout(() => {
    opacity.value = 1
    top.value = '0'
  }, 0)
}

onMounted(() => {
  resetAnimation()
})

watch(() => props.index, () => resetAnimation)
</script>

<template>
  <div class="relative" :style="{ transition: `all 0.2s ${index * 0.1}s`, opacity, top }">
    <NuxtLink
      :to="to"
      :title="title"
      class="group relative top-0 block w-full overflow-hidden rounded-3xl bg-white transition-all hover:-top-1 hover:bg-hana-blue-200/40 hover:shadow-lg active:scale-95 active:bg-hana-blue-200"
      :class="{ 'md:flex md:rounded-lg': type === 'detail', 'md:flex-row-reverse': index % 2 === 0 }"
    >
      <div class="relative aspect-[3/2]" :class="{ 'md:h-36': type === 'detail', 'md:hidden': displayCols > 1 && type === 'detail' }">
        <NuxtImg :src="cover" :alt="`${title}_cover`" class="size-full object-cover" />
      </div>
      <div
        class="relative flex h-36 w-full flex-col justify-between p-4"
        :class="{ 'md:items-center': type === 'detail' }"
      >
        <div class="flex h-6 flex-wrap gap-2 overflow-hidden">
          <ArticleTag v-for="tag in tags" :key="tag" :name="tag" size="small" />
        </div>
        <span class="line-clamp-1 text-lg font-bold leading-none">{{ title }}</span>
        <div class="inline-block">
          <span class="line-clamp-1 text-text" :class="{ 'md:text-center': type === 'detail' }">
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
  </div>
</template>
