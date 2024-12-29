<script setup lang="ts">
import { useStore } from '~/store'

const { headerStatusStore } = useStore()
</script>

<template>
  <thead class="sticky transition-all" :class="[headerStatusStore.hidden ? 'top-0' : 'top-12']">
    <slot />
  </thead>
</template>
