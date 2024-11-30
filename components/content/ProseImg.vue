<script setup lang="ts">
import { joinURL, withLeadingSlash, withTrailingSlash } from 'ufo'

const props = withDefaults(
  defineProps<{
    src: string
    alt?: string
    width?: string | number
    height?: string | number
  }>(),
  {
    alt: '',
    width: undefined,
    height: undefined,
  },
)

const refinedSrc = computed(() => {
  if (props.src?.startsWith('/') && !props.src.startsWith('//')) {
    const _base = withLeadingSlash(withTrailingSlash(useRuntimeConfig().app.baseURL))
    if (_base !== '/' && !props.src.startsWith(_base)) {
      return joinURL(_base, props.src)
    }
  }
  return props.src
})
</script>

<template>
  <ClientOnly>
    <HanaImgViewer :img-url="refinedSrc" :img-alt="alt" :width="width" :height="height" />
  </ClientOnly>
</template>
