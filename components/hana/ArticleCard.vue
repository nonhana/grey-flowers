<script setup lang="ts">
import type { ArticleCardProps } from '~/types/article'

withDefaults(defineProps<ArticleCardProps>(), { type: 'common' })

const coverRef = ref<HTMLDivElement | null>(null)

function handleClick() {
  if (coverRef.value) {
    const coverClone = coverRef.value.cloneNode(true) as HTMLDivElement
    coverClone.id = 'cover-clone'
    coverClone.style.position = 'absolute'
    const rect = coverRef.value.getBoundingClientRect()
    coverClone.style.top = `${rect.top}px`
    coverClone.style.left = `${rect.left}px`
    coverClone.style.width = `${coverRef.value.offsetWidth}px`
    coverClone.style.height = `${coverRef.value.offsetHeight}px`
    coverClone.style.padding = '0 2rem'
    coverClone.style.margin = '2rem 0'
    coverClone.style.transition = 'all 0.3s'
    document.querySelector('#main-wrapper')!.appendChild(coverClone)
    setTimeout(() => {
      coverClone.style.top = '0'
      coverClone.style.left = '0'
      coverClone.style.width = '100%'
      coverClone.style.height = '240px'
    }, 0)
    setTimeout(() => {
      coverClone.style.opacity = '0'
    }, 300)
    setTimeout(() => {
      coverClone.remove()
    }, 600)
  }
}
</script>

<template>
  <NuxtLink
    :to="to"
    :title="title"
    class="relative top-0 block w-full overflow-hidden rounded-3xl bg-white transition-all hover:-top-1 hover:bg-hana-blue-200/40 hover:shadow-lg active:scale-95 active:bg-hana-blue-200" :class="{ 'md:rounded-lg md:article-detail-item': type === 'detail' }"
    @click="handleClick"
  >
    <div ref="coverRef" class="relative aspect-[3/2] shrink-0" :class="{ 'md:h-36': type === 'detail' }">
      <NuxtImg :src="cover" :alt="`${title}_cover`" class="size-full object-cover" />
    </div>
    <div class="relative flex h-36 w-full flex-col justify-between p-4" :class="{ 'md:items-center': type === 'detail' }">
      <div class="flex gap-2 overflow-hidden">
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
