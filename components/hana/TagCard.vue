<script setup lang="ts">
const props = withDefaults(defineProps<{
  id: number
  name: string
  color: string
  count: number
}>(), {})

const width = ref(`${4 * props.count}px`)
</script>

<template>
  <div class="flex max-h-80 min-h-10 min-w-10 max-w-80 shrink-0 items-center justify-center rounded-lg p-5" :style="{ background: color, width, height: width }">
    <span :class="isWarmHue(color) ? 'text-black' : 'text-white'">{{ name }}</span>
  </div>
</template>
