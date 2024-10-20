<script setup lang="ts">
withDefaults(defineProps<{
  icon?: string
}>(), {
})
</script>

<template>
  <div>
    <slot />
  </div>
</template>
