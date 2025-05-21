<script setup lang="ts">
const props = defineProps<{
  src: string
  alt?: string
  width?: string | number
  height?: string | number
}>()

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

  // Remove trailing slash from base if path starts with slash
  if (base.charAt(base.length - 1) === '/' && path.charAt(0) === '/') {
    return base + path.slice(1)
  }

  // Add slash between base and path if neither has it
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
    <div class="m-auto w-full md:w-3/5">
      <HanaImgViewer v-bind="{ ...props, src: refinedSrc }" />
    </div>
  </ClientOnly>
</template>
