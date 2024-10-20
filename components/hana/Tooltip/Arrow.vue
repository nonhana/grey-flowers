<script setup lang="ts">
const props = defineProps<{
  position: 'top' | 'bottom' | 'left' | 'right'
  offset?: number
}>()

const positionClass = computed(() => {
  switch (props.position) {
    case 'top':
      return 'top-full left-1/2 -translate-x-1/2 border-x-transparent border-b-transparent border-t-white'
    case 'bottom':
      return 'bottom-full left-1/2 -translate-x-1/2 border-x-transparent border-t-transparent border-b-white'
    case 'left':
      return 'left-full top-1/2 -translate-y-1/2 border-y-transparent border-r-transparent border-l-white'
    case 'right':
      return 'right-full top-1/2 -translate-y-1/2 border-y-transparent border-l-transparent border-r-white'
    default:
      return ''
  }
})
</script>

<template>
  <span class="absolute box-border size-0 border-8" :class="positionClass" />
</template>
