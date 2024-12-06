<script setup lang="ts">
import { joinURL, withLeadingSlash, withTrailingSlash } from 'ufo'

const props = defineProps<{
  src: string
  alt?: string
  width?: string | number
  height?: string | number
}>()

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
    <div class="m-auto w-full md:w-3/5">
      <HanaImgViewer v-bind="{ ...props, src: refinedSrc }" />
    </div>
  </ClientOnly>
</template>
