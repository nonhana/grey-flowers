<script setup lang="ts">
import type { LucideIcon } from '@lucide/vue'

const props = withDefaults(defineProps<{
  icon?: LucideIcon
  to?: string
  command?: string
  center?: boolean
}>(), {
  center: false,
})

const component = computed(() => {
  if (props.to)
    return resolveComponent('NuxtLink')
  return 'li'
})
</script>

<template>
  <component
    :is="component"
    :to="to"
    class="min-w-[100px] hana-button gap-2"
    :class="[center ? 'justify-center' : 'justify-start']"
    v-bind="command ? { 'data-command': command } : {}"
  >
    <component :is="icon" v-if="icon" :size="20" />
    <slot />
  </component>
</template>
