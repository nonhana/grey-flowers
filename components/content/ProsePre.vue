<script setup lang="ts">
withDefaults(defineProps<{
  code?: string
  language?: string | null
  filename?: string
  highlights?: number[]
  meta?: string | null
}>(), {
  code: '',
  language: null,
  filename: '',
  highlights: () => [],
  meta: null,
})
</script>

<template>
  <pre class="max-w-96"><slot /></pre>
</template>
