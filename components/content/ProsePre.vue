<script setup lang="ts">
const props = withDefaults(defineProps<{
  code?: string
  language?: string
  filename?: string
  highlights?: number[]
  meta?: string
  class?: string
}>(), {
  code: '',
  highlights: () => [],
})
</script>

<template>
  <pre :class="props.class"><slot /></pre>
</template>
