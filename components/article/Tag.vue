<script setup lang="ts">
import type { Tag } from '~/types/article'

withDefaults(defineProps<Tag>(), {
  name: '暂无标签',
  color: 'gray',
})
</script>

<template>
  <span
    class="cursor-pointer select-none rounded-md px-4 py-2 transition-all hover:opacity-80"
    :class="[isWarmHue(color) ? 'text-black' : 'text-white']"
    :style="{ background: color }"
  >
    {{ name }}
  </span>
</template>
