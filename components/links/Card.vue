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
      class="relative top-0 flex gap-5 hana-card transition-all active:scale-95 p-5! hover:-translate-y-1 active:bg-hana-blue-200! dark:bg-hana-black-700! hover:bg-hana-blue-150! hover:shadow-lg! dark:active:bg-hana-black-800! dark:hover:bg-hana-black-800!"
    >
      <LinksCardImg :site="site" :image="image" />
      <div class="h-16 flex flex-col">
        <span class="text-black line-clamp-1 dark:text-hana-white">{{ site }}</span>
        <div class="flex flex-1 items-center">
          <span class="text-xs font-code line-clamp-2">{{ desc }}</span>
        </div>
      </div>
    </NuxtLink>
  </div>
</template>
