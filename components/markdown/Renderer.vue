<script setup lang="ts">
import type { MarkdownRenderPayload } from '~/types/markdown'

defineOptions({
  inheritAttrs: false,
})

const props = defineProps<{
  value?: MarkdownRenderPayload | null
}>()
const emits = defineEmits<{
  (e: 'ready'): void
}>()

const attrs = useAttrs()
const rendererAttrs = computed<Record<string, unknown>>(() => attrs)
const renderCycle = ref(0)

watch(() => props.value?.body, () => {
  renderCycle.value += 1
})
</script>

<template>
  <MDCRenderer
    v-if="value?.body"
    :key="renderCycle"
    v-bind="rendererAttrs"
    :body="value.body"
    :data="value.data"
    @vue:mounted="emits('ready')"
  >
    <slot />
  </MDCRenderer>
  <slot v-else name="empty" />
</template>
