<script setup lang="ts">
import type { LucideIcon } from '@lucide/vue'

defineProps<{
  title: string
  icon: LucideIcon
}>()
</script>

<template>
  <div>
    <div class="mb-6 w-full flex items-center justify-between text-text dark:text-hana-white-700">
      <div class="flex items-center gap-2 text-2xl">
        <component :is="icon" :size="32" />
        <span>
          {{ title }}
        </span>
      </div>
      <slot name="action" />
    </div>
    <slot />
  </div>
</template>
