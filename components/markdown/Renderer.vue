<script setup lang="ts">
import type { MarkdownRenderPayload } from '~/types/markdown'

defineOptions({
  inheritAttrs: false,
})

defineProps<{
  value?: MarkdownRenderPayload | null
}>()

const attrs = useAttrs()
const rendererAttrs = computed<Record<string, unknown>>(() => attrs)
</script>

<template>
  <MDCRenderer
    v-if="value?.body"
    v-bind="rendererAttrs"
    :body="value.body"
    :data="value.data"
  >
    <slot />
  </MDCRenderer>
  <slot v-else name="empty" />
</template>
