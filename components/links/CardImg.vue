<script setup lang="ts">
const props = defineProps<{
  site: string
  image: string
}>()

const firstCharOfSite = props.site.charAt(0).toUpperCase()

const imgLoadError = ref(false)

function handleImgLoadError(e: string | Event) {
  imgLoadError.value = true
  console.error('Image failed to load:', e)
}
</script>

<template>
  <NuxtImg v-if="!imgLoadError" :src="image" :alt="`${site}_logo`" width="64" height="64" class="shrink-0 rounded-lg" @error="handleImgLoadError" />
  <div v-else class="h-16 w-16 flex shrink-0 select-none items-center justify-center rounded-lg bg-hana-blue text-xl">
    <span class="text-white">{{ firstCharOfSite }}</span>
  </div>
</template>
