<script setup lang="ts">
withDefaults(defineProps<{
  name: string
  size?: 'small' | 'medium' | 'large'
  count?: number
}>(), {
  size: 'medium',
})

const bgColor = ref('#3d3d3d')
</script>

<template>
  <span
    v-if="!count"
    class="cursor-pointer select-none rounded-md transition-all hover:opacity-80"
    :class="[
      isWarmHue(bgColor) ? 'text-black' : 'text-white',
      size === 'small' ? 'px-2 py-0.5 text-sm' : 'px-4 py-2',
    ]"
    :style="{ background: bgColor }"
  >
    {{ name }}
  </span>
  <span
    v-else
    class="cursor-pointer transition-all hover:text-hana-blue"
    :class="{
      'text-2xl text-error-2': count >= 5,
      'text-xl text-hana-blue-300': count >= 3 && count < 5,
      'text-base text-primary-300': count < 3,
    }"
  >
    {{ name }}
  </span>
</template>
