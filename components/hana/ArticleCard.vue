<script setup lang="ts">
import type { ArticleCardProps, Tag } from '~/types/article'

const props = withDefaults(defineProps<ArticleCardProps>(), { type: 'common' })

const tags = ref<Tag[]>(props.tags.map((tag, index) => ({
  id: index,
  name: tag,
  color: '#3d3d3d',
})))

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
    coverClone.style.transition = 'all 0.3s'
    document.querySelector('main')!.appendChild(coverClone)
    setTimeout(() => {
      coverClone.style.top = '0'
      coverClone.style.left = '0'
      coverClone.style.width = '100%'
      coverClone.style.height = '300px'
    }, 0)
  }
}
</script>

<template>
  <NuxtLink
    :to="`articles/${id}`" class="relative top-0 overflow-hidden bg-white transition-all hover:-top-1 hover:bg-great-blue-200/40 hover:shadow-lg" :class="[type === 'detail' ? 'rounded-lg article-detail-item' : 'block rounded-3xl']"
    @click="handleClick"
  >
    <div ref="coverRef" class="relative aspect-[3/2] shrink-0" :class="{ 'h-36': type === 'detail' }">
      <NuxtImg :src="cover" :alt="`${title}_cover`" class="size-full object-cover" />
    </div>
    <div class="relative flex h-36 flex-col justify-between p-4">
      <div class="flex gap-2">
        <span
          v-for="tag in tags"
          :key="tag.id" class="rounded-md px-2 py-0.5 text-sm"
          :class="[isWarmHue(tag.color) ? 'text-black' : 'text-white']"
          :style="{ background: tag.color }"
        >{{ tag.name }}</span>
      </div>
      <h2 class="text-lg font-bold leading-none">
        {{ title }}
      </h2>
      <div class="inline-block">
        <span class="line-clamp-2 leading-none text-text">
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
