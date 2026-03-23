<script setup lang="ts">
import type { PropsType } from 'hana-img-viewer'
import { HanaImgViewer } from 'hana-img-viewer'

type ProseImgProps = Pick<
  PropsType,
  | 'src'
  | 'alt'
  | 'previewSrc'
  | 'containerClass'
  | 'containerStyle'
  | 'thumbnailClass'
  | 'thumbnailStyle'
>

const props = defineProps<ProseImgProps>()

function withLeadingSlash(path: string): string {
  return path.charAt(0) === '/' ? path : `/${path}`
}

function withTrailingSlash(path: string): string {
  return path.charAt(path.length - 1) === '/' ? path : `${path}/`
}

function joinURL(base: string, path: string): string {
  if (!base)
    return path
  if (!path)
    return base

  if (base.charAt(base.length - 1) === '/' && path.charAt(0) === '/') {
    return base + path.slice(1)
  }

  if (base.charAt(base.length - 1) !== '/' && path.charAt(0) !== '/') {
    return `${base}/${path}`
  }

  return base + path
}

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
    <HanaImgViewer v-bind="{ ...props, src: refinedSrc }" />
  </ClientOnly>
</template>
