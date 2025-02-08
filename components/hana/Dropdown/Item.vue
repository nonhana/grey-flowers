<script setup lang="ts">
const props = withDefaults(defineProps<{
  icon?: string
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
    class="hana-button min-w-[100px] gap-2"
    :class="[center ? 'justify-center' : 'justify-start']"
    v-bind="command ? { 'data-command': command } : {}"
  >
    <Icon v-if="icon" :name="icon" size="20" />
    <slot />
  </component>
</template>
