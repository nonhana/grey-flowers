<script setup lang="ts">
import type { HanaImgViewerProps } from 'hana-img-viewer'
import { HanaImgViewer } from 'hana-img-viewer'

type ProseImgProps = Pick<
  HanaImgViewerProps,
  | 'src'
  | 'alt'
  | 'previewSrc'
  | 'containerClass'
  | 'containerStyle'
  | 'thumbnailClass'
  | 'thumbnailStyle'
>

const props = defineProps<ProseImgProps>()
const img = useImage()

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

function refineSource(src?: string) {
  if (src?.startsWith('/') && !src.startsWith('//')) {
    const _base = withLeadingSlash(withTrailingSlash(useRuntimeConfig().app.baseURL))
    if (_base !== '/' && !src.startsWith(_base)) {
      return joinURL(_base, src)
    }
  }
  return src
}

function shouldOptimizeThumbnail(src: string) {
  const pathname = src.startsWith('http://') || src.startsWith('https://')
    ? new URL(src).pathname
    : src

  return !pathname.endsWith('.gif') && !pathname.endsWith('.svg')
}

const refinedSrc = computed(() => refineSource(props.src) || '')
const refinedPreviewSrc = computed(() => refineSource(props.previewSrc))
const thumbnailSrc = computed(() => {
  if (refinedPreviewSrc.value)
    return refinedSrc.value

  if (!shouldOptimizeThumbnail(refinedSrc.value))
    return refinedSrc.value

  return img(refinedSrc.value, {}, { preset: 'articleBodyPreview' })
})
const viewerPreviewSrc = computed(() => {
  if (refinedPreviewSrc.value)
    return refinedPreviewSrc.value

  return shouldOptimizeThumbnail(refinedSrc.value) ? refinedSrc.value : undefined
})
</script>

<template>
  <HanaImgViewer
    v-bind="{
      ...props,
      src: thumbnailSrc,
      previewSrc: viewerPreviewSrc,
    }"
  />
</template>
