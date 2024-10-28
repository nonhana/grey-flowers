<script setup lang="ts">
withDefaults(defineProps<{
  name: string
  size?: 'small' | 'medium'
}>(), {
  size: 'medium',
})

const bgColor = ref('#3d3d3d')
</script>

<template>
  <span
    class="cursor-pointer select-none rounded-md transition-all hover:opacity-80"
    :class="[
      isWarmHue(bgColor) ? 'text-black' : 'text-white',
      size === 'small' ? 'px-2 py-0.5 text-sm' : 'px-4 py-2',
    ]"
    :style="{ background: bgColor }"
  >
    {{ name }}
  </span>
</template>
