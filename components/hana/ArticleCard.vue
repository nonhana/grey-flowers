<script setup lang="ts">
import type { ArticleCardProps, Tag } from '~/types/article'

const props = withDefaults(defineProps<ArticleCardProps>(), {})

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
    coverClone.style.top = `${coverRef.value.offsetTop}px`
    coverClone.style.left = `${coverRef.value.offsetLeft}px`
    coverClone.style.width = `${coverRef.value.offsetWidth}px`
    coverClone.style.height = `${coverRef.value.offsetHeight}px`
    coverClone.style.transition = 'all 0.3s'
    document.body.appendChild(coverClone)
    setTimeout(() => {
      coverClone.style.top = '50px'
      coverClone.style.left = '0'
      coverClone.style.width = '100%'
    }, 0)
  }
}
</script>

<template>
  <article
    class="overflow-hidden rounded-3xl bg-white transition-all duration-300 hover:bg-great-blue-200/40 hover:shadow-lg"
    @click="handleClick"
  >
    <NuxtLink :to="`articles/${id}`" class="block size-full">
      <div ref="coverRef" class="relative aspect-[3/2]">
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
  </article>
</template>
