<script setup lang="ts">
import type { LinkCardProps } from '~/types/link'

defineProps<LinkCardProps & { index: number }>()

const opacity = ref(0)
const top = ref('10px')

onMounted(() => {
  floatAnimation(opacity, top)
})
</script>

<template>
  <div class="relative" :style="{ transition: `all 0.2s ${index * 0.1}s`, opacity, transform: `translateY(${top})` }">
    <NuxtLink
      :to="url"
      :aria-label="`${owner}的个人网站`"
      target="_blank"
      :title="desc"
      class="hana-card relative top-0 flex gap-5 p-5 transition-all hover:-translate-y-1 hover:bg-hana-blue-150 hover:shadow-lg active:scale-95 active:bg-hana-blue-200 dark:bg-hana-black-700 dark:hover:bg-hana-black-800"
    >
      <NuxtImg :src="image" :alt="`${owner}_avatar`" class="size-16 rounded-lg" />
      <div class="flex h-16 flex-col">
        <span class="line-clamp-1 text-black dark:text-hana-white">{{ site }}</span>
        <div class="flex flex-1 items-center">
          <span class="line-clamp-2 font-code text-xs">{{ desc }}</span>
        </div>
      </div>
    </NuxtLink>
  </div>
</template>
